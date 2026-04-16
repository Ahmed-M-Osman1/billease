import type * as Party from 'partykit/server'
import { makeSlug } from '../lib/slug'

const PERSON_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#14b8a6', // teal
] as const

export interface SharedSpec {
  mode: 'all' | 'subset'
  people: string[] // personSlugs — only used when mode='subset'
}

export interface BillItem {
  id: string
  name: string
  price: number
  shared?: SharedSpec // undefined = individually claimable
}

export interface SessionPerson {
  id: string
  name: string
  slug: string
  color: string
  requestId?: string // used by join page to correlate JOIN response
}

export interface RoomState {
  items: BillItem[]
  people: SessionPerson[]
  joinedPeople: SessionPerson[] // walk-in joiners via /join
  assignments: Record<string, string | null> // itemId → personSlug | null (individual items only)
}

// Client → Server messages
export type ClientMessage =
  | { type: 'INIT'; items: BillItem[]; people: SessionPerson[] }
  | { type: 'CLAIM'; personSlug: string; itemId: string }
  | { type: 'UNCLAIM'; personSlug: string; itemId: string }
  | { type: 'JOIN'; name: string; slug: string; requestId: string }

// Server → Client messages
export type ServerMessage =
  | { type: 'STATE'; state: RoomState }
  | { type: 'ASSIGNMENTS'; assignments: Record<string, string | null> }
  | { type: 'JOIN_ERROR'; requestId: string; reason: 'room_not_ready' | 'name_taken' }

export default class BillSession implements Party.Server {
  state: RoomState = { items: [], people: [], joinedPeople: [], assignments: {} }

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const stored = await this.room.storage.get<Partial<RoomState>>('state')
    if (stored) {
      this.state = {
        items: stored.items ?? [],
        people: stored.people ?? [],
        joinedPeople: stored.joinedPeople ?? [], // hydration guard for rooms created before this schema
        assignments: stored.assignments ?? {},
      }
    }
  }

  async onConnect(conn: Party.Connection) {
    const msg: ServerMessage = { type: 'STATE', state: this.state }
    conn.send(JSON.stringify(msg))
  }

  async onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage
    try {
      msg = JSON.parse(message) as ClientMessage
    } catch {
      return
    }

    if (msg.type === 'INIT') {
      if (this.state.items.length === 0) {
        this.state = {
          items: msg.items,
          people: msg.people,
          joinedPeople: [],
          assignments: {},
        }
        await this.room.storage.put('state', this.state)
        const broadcast: ServerMessage = { type: 'STATE', state: this.state }
        this.room.broadcast(JSON.stringify(broadcast))
      } else {
        // Already initialized — send current state back to organizer
        const reply: ServerMessage = { type: 'STATE', state: this.state }
        sender.send(JSON.stringify(reply))
      }
      return
    }

    if (msg.type === 'JOIN') {
      // Guard: room must be initialized before joiners can enter
      if (this.state.items.length === 0) {
        const err: ServerMessage = {
          type: 'JOIN_ERROR',
          requestId: msg.requestId,
          reason: 'room_not_ready',
        }
        sender.send(JSON.stringify(err))
        return
      }

      // Name uniqueness check (case-insensitive)
      const allNames = [
        ...this.state.people.map((p) => p.name.toLowerCase()),
        ...this.state.joinedPeople.map((p) => p.name.toLowerCase()),
      ]
      if (allNames.includes(msg.name.toLowerCase())) {
        const err: ServerMessage = {
          type: 'JOIN_ERROR',
          requestId: msg.requestId,
          reason: 'name_taken',
        }
        sender.send(JSON.stringify(err))
        return
      }

      // Slug collision resolution (server-side, includes reserved routes)
      const usedSlugs = new Set([
        ...this.state.people.map((p) => p.slug),
        ...this.state.joinedPeople.map((p) => p.slug),
        'payer',
        'join',
      ])
      const resolvedSlug = makeSlug(msg.name, usedSlugs)

      // Assign color server-side to avoid race conditions
      const colorIndex =
        (this.state.people.length + this.state.joinedPeople.length) % PERSON_COLORS.length
      const color = PERSON_COLORS[colorIndex]

      const newPerson: SessionPerson = {
        id: `join-${msg.requestId}`,
        name: msg.name,
        slug: resolvedSlug,
        color,
        requestId: msg.requestId,
      }

      this.state.joinedPeople.push(newPerson)
      await this.room.storage.put('state', this.state)

      const broadcast: ServerMessage = { type: 'STATE', state: this.state }
      this.room.broadcast(JSON.stringify(broadcast))
      return
    }

    if (msg.type === 'CLAIM') {
      const { personSlug, itemId } = msg
      // Validate person exists (pre-registered or walk-in)
      const allPeople = [...this.state.people, ...this.state.joinedPeople]
      if (!allPeople.find((p) => p.slug === personSlug)) return
      // Validate item exists and is not shared
      const item = this.state.items.find((i) => i.id === itemId)
      if (!item) return
      if (item.shared) return // shared items are not claimable

      this.state.assignments[itemId] = personSlug
      await this.room.storage.put('state', this.state)

      const broadcast: ServerMessage = {
        type: 'ASSIGNMENTS',
        assignments: this.state.assignments,
      }
      this.room.broadcast(JSON.stringify(broadcast))
      return
    }

    if (msg.type === 'UNCLAIM') {
      const { personSlug, itemId } = msg
      if (this.state.assignments[itemId] !== personSlug) return

      this.state.assignments[itemId] = null
      await this.room.storage.put('state', this.state)

      const broadcast: ServerMessage = {
        type: 'ASSIGNMENTS',
        assignments: this.state.assignments,
      }
      this.room.broadcast(JSON.stringify(broadcast))
      return
    }
  }
}

BillSession satisfies Party.Worker
