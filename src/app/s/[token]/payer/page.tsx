'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import PartySocket from 'partysocket'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import type { ServerMessage, RoomState, SessionPerson } from '@/party/bill-session'

type PersonStatus = 'not-started' | 'in-progress'

function getPersonStatus(
  personSlug: string,
  assignments: Record<string, string | null>
): PersonStatus {
  const claimedCount = Object.values(assignments).filter((s) => s === personSlug).length
  return claimedCount === 0 ? 'not-started' : 'in-progress'
}

export default function PayerPage() {
  const params = useParams()
  const token = params.token as string

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string | null>>({})
  const [showSummary, setShowSummary] = useState(false)
  const socketRef = useRef<PartySocket | null>(null)

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999'

  useEffect(() => {
    const ws = new PartySocket({ host, room: token })
    socketRef.current = ws

    ws.addEventListener('message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage
        if (msg.type === 'STATE') {
          setRoomState(msg.state)
          setAssignments(msg.state.assignments)
          setStatus('ready')
        }
        if (msg.type === 'ASSIGNMENTS') {
          setAssignments(msg.assignments)
        }
      } catch {
        // ignore
      }
    })

    ws.addEventListener('error', () => {
      if (status === 'loading') setStatus('error')
    })

    return () => {
      ws.close()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const nudge = (personSlug: string) => {
    if (!roomState) return
    const baseUrl = window.location.origin
    const url = `${baseUrl}/s/${token}/${personSlug}`
    const msg = encodeURIComponent(`Hey! Can you claim your items here: ${url}`)
    navigator.clipboard.writeText(`https://wa.me/?text=${msg}`)
  }

  const formatPrice = (price: number) =>
    price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading session...</p>
        </div>
      </div>
    )
  }

  if (status === 'error' || !roomState) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-lg font-semibold">Could not load this session.</p>
          <p className="text-sm text-muted-foreground">
            This split may have expired or the session ID is invalid.
          </p>
          <a href="/" className="text-sm text-primary underline">
            Start a new split
          </a>
        </div>
      </div>
    )
  }

  // All participants = pre-registered + walk-in joiners
  const allPeople: SessionPerson[] = [
    ...(roomState.people ?? []),
    ...(roomState.joinedPeople ?? []),
  ]
  const allPeopleCount = Math.max(1, allPeople.length)

  // Per-person totals for Recalculate summary
  const claimableItems = roomState.items.filter((i) => !i.shared)
  const sharedAllItems = roomState.items.filter((i) => i.shared?.mode === 'all')
  const unclaimedItems = claimableItems.filter(
    (i) => !assignments[i.id] || assignments[i.id] === null
  )
  const unclaimedShare =
    unclaimedItems.reduce((s, i) => s + i.price, 0) / allPeopleCount

  const perPersonTotals = allPeople.map((person) => {
    const claimed = claimableItems.filter((i) => assignments[i.id] === person.slug)
    const claimedTotal = claimed.reduce((s, i) => s + i.price, 0)

    const sharedAllTotal = sharedAllItems.reduce(
      (s, i) => s + i.price / allPeopleCount,
      0
    )

    const sharedSubsetTotal = roomState.items
      .filter(
        (i) =>
          i.shared?.mode === 'subset' && i.shared.people.includes(person.slug)
      )
      .reduce((s, i) => s + i.price / Math.max(1, i.shared!.people.length), 0)

    return {
      person,
      claimed,
      total: claimedTotal + sharedAllTotal + sharedSubsetTotal + unclaimedShare,
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold">Organizer View</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Watch items get claimed in real time. Hit Recalculate when everyone&apos;s done.
          </p>
        </div>

        {/* Participants — pre-registered + walk-in */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Participants ({allPeople.length})
          </h2>
          {allPeople.map((person) => {
            const personStatus = getPersonStatus(person.slug, assignments)
            const claimedCount = Object.values(assignments).filter(
              (s) => s === person.slug
            ).length
            const isWalkIn = (roomState.joinedPeople ?? []).some(
              (p) => p.slug === person.slug
            )

            return (
              <div
                key={person.slug}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: person.color }}
                  >
                    {person.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{person.name}</p>
                      {isWalkIn && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          joined
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {personStatus === 'not-started'
                        ? 'Not started'
                        : `${claimedCount} item${claimedCount !== 1 ? 's' : ''} claimed`}
                    </p>
                  </div>
                </div>
                {personStatus === 'not-started' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nudge(person.slug)}
                    title="Copy WhatsApp nudge link"
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Nudge
                  </Button>
                )}
                {personStatus === 'in-progress' && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    In progress
                  </span>
                )}
              </div>
            )
          })}

          {allPeople.length === 0 && (
            <p className="text-sm text-muted-foreground px-1">
              No one has joined yet. Share the link above.
            </p>
          )}
        </div>

        {/* Bill items */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Items
          </h2>
          {roomState.items.map((item) => {
            const owner = assignments[item.id]
            const ownerPerson = owner
              ? allPeople.find((p) => p.slug === owner)
              : null
            const isShared = !!item.shared

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
                style={
                  ownerPerson
                    ? {
                        borderColor: ownerPerson.color + '60',
                        backgroundColor: ownerPerson.color + '12',
                      }
                    : {}
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  {ownerPerson ? (
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ownerPerson.color }}
                    />
                  ) : (
                    <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  {isShared && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      {item.shared!.mode === 'all'
                        ? 'shared'
                        : `shared ${item.shared!.people.length}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {ownerPerson && (
                    <span className="text-xs text-muted-foreground">{ownerPerson.name}</span>
                  )}
                  {!ownerPerson && !isShared && (
                    <span className="text-xs text-muted-foreground italic">Unclaimed</span>
                  )}
                  <span className="text-sm font-medium">{formatPrice(item.price)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recalculate */}
        <Button
          onClick={() => setShowSummary(true)}
          variant="outline"
          className="w-full"
          size="lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recalculate
        </Button>

        {/* Summary */}
        {showSummary && (
          <div className="space-y-3 border rounded-xl p-4">
            <h2 className="text-sm font-semibold">Current Summary</h2>
            {perPersonTotals.map(({ person, claimed, total }) => (
              <div key={person.slug} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: person.color }}
                    />
                    <span className="text-sm font-medium">{person.name}</span>
                  </div>
                  <span className="text-sm font-bold">{formatPrice(total)}</span>
                </div>
                <div className="pl-7 space-y-0.5">
                  {claimed.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>{item.name}</span>
                      <span>{formatPrice(item.price)}</span>
                    </div>
                  ))}
                  {(sharedAllItems.length > 0 || unclaimedShare > 0) && (
                    <div className="flex justify-between text-xs text-muted-foreground italic">
                      <span>Shared + unclaimed split</span>
                      <span>
                        +
                        {formatPrice(
                          sharedAllItems.reduce((s, i) => s + i.price / allPeopleCount, 0) +
                            unclaimedShare
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
