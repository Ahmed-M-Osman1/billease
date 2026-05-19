'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PartySocket from 'partysocket'
import { nanoid } from 'nanoid'
import { useBillStore } from '@/stores/bill-store'
import { Button } from '@/components/ui/button'
import { WizardNavigation } from './wizard-navigation'
import { SharedItemsPanel } from './shared-items-panel'
import { Copy, Check, ExternalLink, Loader2, Play } from 'lucide-react'
import type { ClientMessage, ServerMessage, SessionPerson, SharedSpec } from '@/party/bill-session'
import { makeSlug } from '@/lib/slug'

export function StepShare() {
  const store = useBillStore()
  const router = useRouter()

  const [token] = useState<string>(() => nanoid(10))
  const [sessionPeople] = useState<SessionPerson[]>(() => {
    const used = new Set<string>()
    return store.people.map((p, i) => ({
      id: p.id,
      name: p.name,
      slug: makeSlug(p.name, used) || `participant-${i + 1}`,
      color: p.color,
    }))
  })

  // Shared markings — local state, set before INIT
  const [sharedMarkings, setSharedMarkings] = useState<Map<string, SharedSpec | undefined>>(
    () => new Map()
  )

  const [initialized, setInitialized] = useState(false) // true after "Start Session" clicked + confirmed
  const [wsReady, setWsReady] = useState(false) // true after WS connects (enables Start Session button)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [copiedJoin, setCopiedJoin] = useState(false)
  const socketRef = useRef<PartySocket | null>(null)
  const retryCountRef = useRef(0)

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999'
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function connect() {
    if (socketRef.current) socketRef.current.close()

    const ws = new PartySocket({ host, room: token })
    socketRef.current = ws

    ws.addEventListener('open', () => {
      setError(null)
      setWsReady(true)
    })

    ws.addEventListener('message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage
        if (msg.type === 'STATE') {
          setInitialized(true)
          setError(null)
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.addEventListener('error', () => {
      setError('Could not connect to sharing service.')
      setWsReady(false)
    })

    ws.addEventListener('close', () => {
      if (!initialized) setWsReady(false)
    })
  }

  useEffect(() => {
    connect()
    return () => {
      socketRef.current?.close()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = () => {
    if (retryCountRef.current >= 3) return
    retryCountRef.current += 1
    setRetryCount(retryCountRef.current)
    setInitialized(false)
    setWsReady(false)
    setError(null)
    connect()
  }

  const handleStartSession = () => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    const msg: ClientMessage = {
      type: 'INIT',
      items: store.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        shared: sharedMarkings.get(item.id),
      })),
      people: sessionPeople,
    }
    ws.send(JSON.stringify(msg))
  }

  const handleMarkingChange = (itemId: string, spec: SharedSpec | undefined) => {
    setSharedMarkings((prev) => {
      const next = new Map(prev)
      next.set(itemId, spec)
      return next
    })
  }

  const copyUrl = async (slug: string) => {
    await navigator.clipboard.writeText(`${baseUrl}/s/${token}/${slug}`)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const copyJoinUrl = async () => {
    await navigator.clipboard.writeText(`${baseUrl}/s/${token}/join`)
    setCopiedJoin(true)
    setTimeout(() => setCopiedJoin(false), 2000)
  }

  const noItems = store.items.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Share with everyone</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Mark shared items, then start your session. Each person gets their own link.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={retryCount >= 3}
          >
            {retryCount >= 3 ? 'Failed — refresh page' : 'Retry'}
          </Button>
        </div>
      )}

      {!initialized && (
        <>
          {/* Shared items marking panel */}
          {!noItems && (
            <SharedItemsPanel
              items={store.items.map((i) => ({ id: i.id, name: i.name, price: i.price }))}
              people={sessionPeople}
              markings={sharedMarkings}
              onChange={handleMarkingChange}
            />
          )}

          {noItems && (
            <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No items yet — go back and upload a bill first.
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleStartSession}
            disabled={!wsReady || noItems}
          >
            {!wsReady ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Session
              </>
            )}
          </Button>
        </>
      )}

      {initialized && (
        <>
          {/* Universal join link */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">One link for everyone</h3>
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {baseUrl}/s/{token}/join
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Anyone can open this and type their name
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0"
                onClick={copyJoinUrl}
              >
                {copiedJoin ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Per-person links */}
          {sessionPeople.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Or send personal links</h3>
              {sessionPeople.map((person) => {
                const url = `${baseUrl}/s/${token}/${person.slug}`
                const isCopied = copiedSlug === person.slug
                return (
                  <div
                    key={person.slug}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-7 w-7 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{url}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => copyUrl(person.slug)}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}

          <Button onClick={() => router.push(`/s/${token}/payer`)} className="w-full" size="lg">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Organizer View
          </Button>
        </>
      )}

      <WizardNavigation
        canGoBack={true}
        canGoNext={false}
        onBack={() => store.prevStep()}
        onNext={() => {}}
      />
    </div>
  )
}
