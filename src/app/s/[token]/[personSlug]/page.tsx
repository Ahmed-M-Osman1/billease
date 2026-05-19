'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import PartySocket from 'partysocket'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type {
  ClientMessage,
  ServerMessage,
  RoomState,
  SessionPerson,
  BillItem,
} from '@/party/bill-session'

type ClaimStatus = 'loading' | 'ready' | 'submitted' | 'error'

export default function ClaimPage() {
  const params = useParams()
  const token = params.token as string
  const personSlug = params.personSlug as string

  const [status, setStatus] = useState<ClaimStatus>('loading')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string | null>>({})
  const [me, setMe] = useState<SessionPerson | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [takenFlash, setTakenFlash] = useState<string | null>(null)
  const socketRef = useRef<PartySocket | null>(null)
  const offlineQueueKey = `billease-offline-${token}-${personSlug}`

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999'

  useEffect(() => {
    const ws = new PartySocket({ host, room: token })
    socketRef.current = ws

    ws.addEventListener('message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage

        if (msg.type === 'STATE') {
          // Search both pre-registered and walk-in joiners
          const person = [
            ...(msg.state.people ?? []),
            ...(msg.state.joinedPeople ?? []),
          ].find((p) => p.slug === personSlug)

          if (!person) {
            setErrorMsg('invalid-slug')
            setStatus('error')
            ws.close()
            return
          }

          setMe(person)
          setRoomState(msg.state)
          setAssignments(msg.state.assignments)
          setStatus('ready')

          // Replay offline queue
          const queued = sessionStorage.getItem(offlineQueueKey)
          if (queued) {
            const queue: ClientMessage[] = JSON.parse(queued)
            queue.forEach((m) => ws.send(JSON.stringify(m)))
            sessionStorage.removeItem(offlineQueueKey)
          }
        }

        if (msg.type === 'ASSIGNMENTS') {
          setAssignments((prev) => {
            Object.entries(msg.assignments).forEach(([itemId, owner]) => {
              if (owner !== personSlug && prev[itemId] === personSlug) {
                setTakenFlash(itemId)
                setTimeout(() => setTakenFlash(null), 2000)
              }
            })
            return msg.assignments
          })
        }
      } catch {
        // ignore
      }
    })

    ws.addEventListener('error', () => {
      if (status === 'loading') {
        setErrorMsg('connection')
        setStatus('error')
      }
    })

    ws.addEventListener('open', () => {
      const queued = sessionStorage.getItem(offlineQueueKey)
      if (queued && status === 'ready') {
        const queue: ClientMessage[] = JSON.parse(queued)
        queue.forEach((m) => ws.send(JSON.stringify(m)))
        sessionStorage.removeItem(offlineQueueKey)
      }
    })

    return () => {
      ws.close()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, personSlug])

  // Update roomState on subsequent STATE messages (for live shared-item cost updates)
  useEffect(() => {
    const ws = socketRef.current
    if (!ws) return

    const handler = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage
        if (msg.type === 'STATE' && status === 'ready') {
          setRoomState(msg.state)
        }
      } catch {
        // ignore
      }
    }
    ws.addEventListener('message', handler)
    return () => ws.removeEventListener('message', handler)
  }, [status])

  function sendOrQueue(msg: ClientMessage) {
    const ws = socketRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    } else {
      const queued = sessionStorage.getItem(offlineQueueKey)
      const queue: ClientMessage[] = queued ? JSON.parse(queued) : []
      queue.push(msg)
      sessionStorage.setItem(offlineQueueKey, JSON.stringify(queue))
    }
  }

  const toggleClaim = (item: BillItem) => {
    if (!me || item.shared) return // shared items are not claimable
    const current = assignments[item.id]
    if (current === me.slug) {
      setAssignments((prev) => ({ ...prev, [item.id]: null }))
      sendOrQueue({ type: 'UNCLAIM', personSlug: me.slug, itemId: item.id })
    } else if (current === null || current === undefined) {
      setAssignments((prev) => ({ ...prev, [item.id]: me.slug }))
      sendOrQueue({ type: 'CLAIM', personSlug: me.slug, itemId: item.id })
    }
    // If claimed by someone else: do nothing
  }

  const handleSubmit = () => {
    setStatus('submitted')
    socketRef.current?.close()
    socketRef.current = null
  }

  const formatPrice = (price: number) =>
    price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Compute totals
  const claimableItems = roomState?.items.filter((i) => !i.shared) ?? []
  const sharedItems = roomState?.items.filter((i) => i.shared) ?? []
  const myClaimedItems = claimableItems.filter((i) => assignments[i.id] === me?.slug)
  const myClaimedTotal = myClaimedItems.reduce((sum, i) => sum + i.price, 0)

  const allPeopleCount = Math.max(
    1,
    (roomState?.people.length ?? 0) + (roomState?.joinedPeople.length ?? 0)
  )

  const mySharedTotal = sharedItems.reduce((sum, item) => {
    if (!item.shared) return sum
    if (item.shared.mode === 'all') {
      return sum + item.price / allPeopleCount
    }
    if (item.shared.mode === 'subset' && item.shared.people.includes(personSlug)) {
      return sum + item.price / Math.max(1, item.shared.people.length)
    }
    return sum
  }, 0)

  const myTotal = myClaimedTotal + mySharedTotal

  // ── Loading / error / submitted screens ───────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading your bill...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold">
            {errorMsg === 'invalid-slug'
              ? "You're not on this bill."
              : 'Could not load this bill.'}
          </p>
          <p className="text-sm text-muted-foreground">
            {errorMsg === 'invalid-slug'
              ? 'Use your personal link or open the join link to add yourself.'
              : 'This split may have expired. Ask the payer to create a new one.'}
          </p>
          <a href="/" className="text-sm text-primary underline">
            Go home
          </a>
        </div>
      </div>
    )
  }

  if (status === 'submitted') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">You&apos;re done!</h2>
          <p className="text-sm text-muted-foreground">{me?.name}, your total is:</p>
          <p className="text-3xl font-bold">{formatPrice(myTotal)}</p>
          {myClaimedItems.length > 0 && (
            <div className="text-left space-y-1 border rounded-lg p-4">
              {myClaimedItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span>{formatPrice(item.price)}</span>
                </div>
              ))}
              {mySharedTotal > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground border-t pt-1 mt-1">
                  <span>Shared items</span>
                  <span>{formatPrice(mySharedTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // status === 'ready'
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">
            Hey {me?.name}, tap what you ordered
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tap an item to claim it. Tap again to unclaim.
          </p>
        </div>

        {/* Shared items — non-claimable */}
        {sharedItems.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Shared items
            </h2>
            {sharedItems.map((item) => {
              if (!item.shared) return null

              const isAll = item.shared.mode === 'all'
              const isInSubset =
                item.shared.mode === 'subset' && item.shared.people.includes(personSlug)

              // Don't show subset items this person isn't part of
              if (item.shared.mode === 'subset' && !isInSubset) return null

              const divisor = isAll
                ? allPeopleCount
                : Math.max(1, item.shared.people.length)
              const share = item.price / divisor

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isAll
                        ? `Split with everyone (${allPeopleCount})`
                        : `Split with you + ${divisor - 1} other${divisor - 1 !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <span className="text-sm font-medium flex-shrink-0 ml-3">
                    {formatPrice(share)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Claimable items */}
        {claimableItems.length > 0 && (
          <div className="space-y-2">
            {sharedItems.length > 0 && (
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Tap what you ordered
              </h2>
            )}
            {claimableItems.map((item) => {
              const owner = assignments[item.id]
              const ismine = owner === me?.slug
              const isTakenByOther =
                owner !== null && owner !== undefined && owner !== me?.slug
              const isTakenFlash = takenFlash === item.id
              const allPeople = [
                ...(roomState?.people ?? []),
                ...(roomState?.joinedPeople ?? []),
              ]
              const ownerPerson = isTakenByOther
                ? allPeople.find((p) => p.slug === owner)
                : null

              return (
                <button
                  key={item.id}
                  onClick={() => toggleClaim(item)}
                  disabled={isTakenByOther && !isTakenFlash}
                  className={[
                    'w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all',
                    ismine
                      ? 'border-primary bg-primary/10'
                      : isTakenFlash
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950'
                      : isTakenByOther
                      ? 'border-muted bg-muted/30 opacity-60 cursor-default'
                      : 'border-border bg-card hover:bg-muted/30 cursor-pointer',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {ismine && (
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: me?.color }}
                      />
                    )}
                    {isTakenByOther && ownerPerson && (
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: ownerPerson.color }}
                      />
                    )}
                    {!ismine && !isTakenByOther && (
                      <div className="h-3 w-3 flex-shrink-0 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isTakenFlash && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">
                        Taken by {ownerPerson?.name ?? 'someone'}
                      </span>
                    )}
                    {isTakenByOther && !isTakenFlash && (
                      <span className="text-xs text-muted-foreground">
                        {ownerPerson?.name}
                      </span>
                    )}
                    <span className="text-sm font-medium">{formatPrice(item.price)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Running total + submit */}
        <div className="sticky bottom-4 rounded-xl border bg-card shadow-lg px-4 py-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-muted-foreground">
                {myClaimedItems.length} item{myClaimedItems.length !== 1 ? 's' : ''} claimed
              </span>
              {mySharedTotal > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  + {formatPrice(mySharedTotal)} shared
                </span>
              )}
            </div>
            <span className="text-lg font-bold">{formatPrice(myTotal)}</span>
          </div>
          <Button onClick={handleSubmit} className="w-full" size="lg">
            Done — that&apos;s my order
          </Button>
        </div>
      </div>
    </div>
  )
}
