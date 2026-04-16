'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PartySocket from 'partysocket'
import { nanoid } from 'nanoid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import type { ClientMessage, ServerMessage, RoomState, SessionPerson } from '@/party/bill-session'
import { makeSlug } from '@/lib/slug'

type JoinStatus =
  | 'connecting'        // WS connecting, loading initial STATE
  | 'ready'             // STATE received, showing name picker
  | 'joining'           // JOIN sent, waiting for STATE with our requestId
  | 'error_not_ready'   // room_not_ready — organizer hasn't started
  | 'error_name_taken'  // name already used
  | 'error_timeout'     // 8s timeout
  | 'error_connection'  // WS failed

const TIMEOUT_MS = 8000

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<JoinStatus>('connecting')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)

  const socketRef = useRef<PartySocket | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999'

  const clearTimeout_ = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => {
    const ws = new PartySocket({ host, room: token })
    socketRef.current = ws

    ws.addEventListener('message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage

        if (msg.type === 'STATE') {
          // First STATE — room loaded, show picker
          if (status === 'connecting' || status === 'error_not_ready') {
            setRoomState(msg.state)
            setStatus('ready')
            return
          }

          // Subsequent STATE while joining — look for our requestId
          if (status === 'joining' && pendingRequestId) {
            const me = msg.state.joinedPeople.find(
              (p: SessionPerson) => p.requestId === pendingRequestId
            )
            if (me) {
              clearTimeout_()
              router.replace(`/s/${token}/${me.slug}`)
            }
            // Not found yet — keep waiting (another STATE will arrive)
          }
        }

        if (msg.type === 'JOIN_ERROR') {
          clearTimeout_()
          if (msg.reason === 'room_not_ready') {
            setStatus('error_not_ready')
          } else if (msg.reason === 'name_taken') {
            setStatus('error_name_taken')
            setNameError('Someone with that name already joined. Try a different name.')
            setStatus('ready')
          }
        }
      } catch {
        // ignore
      }
    })

    ws.addEventListener('error', () => {
      if (status === 'connecting') setStatus('error_connection')
    })

    return () => {
      clearTimeout_()
      ws.close()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Handle STATE updates when already joining (React state closures workaround)
  useEffect(() => {
    if (status !== 'joining' || !pendingRequestId || !roomState) return
    const me = roomState.joinedPeople.find((p) => p.requestId === pendingRequestId)
    if (me) {
      clearTimeout_()
      router.replace(`/s/${token}/${me.slug}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState, pendingRequestId, status])

  const handlePreRegisteredTap = (person: SessionPerson) => {
    router.replace(`/s/${token}/${person.slug}`)
  }

  const handleJoin = () => {
    const name = nameInput.trim()
    if (!name) {
      setNameError('Please enter your name.')
      return
    }
    setNameError(null)

    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setStatus('error_connection')
      return
    }

    const requestId = nanoid(6)
    const slug = makeSlug(name, new Set()) // server resolves collisions, client sends best-guess

    setPendingRequestId(requestId)
    setStatus('joining')

    const msg: ClientMessage = {
      type: 'JOIN',
      name,
      slug,
      requestId,
    }
    ws.send(JSON.stringify(msg))

    // 8s timeout
    timeoutRef.current = setTimeout(() => {
      setStatus('error_timeout')
      setPendingRequestId(null)
    }, TIMEOUT_MS)
  }

  const handleRetry = () => {
    clearTimeout_()
    setPendingRequestId(null)
    setStatus('ready')
    setNameError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleJoin()
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (status === 'connecting') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading session...</p>
        </div>
      </div>
    )
  }

  if (status === 'error_connection') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold">Couldn&apos;t connect</p>
          <p className="text-sm text-muted-foreground">
            Check your link and try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (status === 'error_not_ready') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold">Session not started yet</p>
          <p className="text-sm text-muted-foreground">
            The organizer hasn&apos;t started the session yet. Try again in a moment.
          </p>
          <Button onClick={handleRetry}>Try again</Button>
        </div>
      </div>
    )
  }

  if (status === 'error_timeout') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold">Taking too long</p>
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t confirm your join. Check your connection and try again.
          </p>
          <Button onClick={handleRetry}>Try again</Button>
        </div>
      </div>
    )
  }

  if (status === 'joining') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Joining session...</p>
        </div>
      </div>
    )
  }

  // status === 'ready'
  const preRegistered = roomState?.people ?? []

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-sm mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Who are you?</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tap your name or type it below.
          </p>
        </div>

        {/* Pre-registered people */}
        {preRegistered.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">On this bill</p>
            <div className="grid grid-cols-2 gap-2">
              {preRegistered.map((person) => (
                <button
                  key={person.slug}
                  onClick={() => handlePreRegisteredTap(person)}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate">{person.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {preRegistered.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">or type your name</span>
            <div className="flex-1 border-t" />
          </div>
        )}

        {/* Name input */}
        <div className="space-y-3">
          <Input
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value)
              if (nameError) setNameError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            autoFocus={preRegistered.length === 0}
            className={nameError ? 'border-destructive' : ''}
          />
          {nameError && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={!nameInput.trim()}
          >
            Join
          </Button>
        </div>
      </div>
    </div>
  )
}
