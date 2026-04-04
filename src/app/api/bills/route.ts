import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json([], { status: 401 })

  const bills = await prisma.bill.findMany({
    where: { userId: session.user.id },
    include: { participants: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(bills)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const bill = await prisma.bill.create({
    data: {
      userId: session.user.id,
      title: body.title || 'Untitled Bill',
      date: body.date ? new Date(body.date) : new Date(),
      currency: body.currency ?? 'EGP',
      subtotal: body.subtotal ?? 0,
      vat: body.vat ?? 0,
      serviceCharge: body.serviceCharge ?? 0,
      delivery: body.delivery ?? 0,
      tip: body.tip ?? 0,
      tipMode: body.tipMode ?? 'none',
      status: 'active',
      shareToken: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
      participants: {
        create: (body.people ?? []).map((p: any) => ({
          name: p.name,
          color: p.color,
        })),
      },
    },
    include: { participants: true },
  })

  // Map local person IDs to DB participant IDs
  const personMap = new Map<string, string>()
  ;(body.people ?? []).forEach((p: any, i: number) => {
    if (bill.participants[i]) {
      personMap.set(p.id, bill.participants[i].id)
    }
  })

  // Create split groups
  const poolMap = new Map<string, string>()
  for (const pool of body.customSharedPools ?? []) {
    const group = await prisma.billSplitGroup.create({
      data: {
        billId: bill.id,
        name: pool.name,
        members: {
          create: pool.personIds
            .filter((pid: string) => personMap.has(pid))
            .map((pid: string) => ({ participantId: personMap.get(pid)! })),
        },
      },
    })
    poolMap.set(pool.id, group.id)
  }

  // Create items
  const itemsData = (body.items ?? []).map((item: any) => {
    let assignedToId: string | null = null
    let assignmentType = 'individual'
    let sharedGroupId: string | null = null

    if (item.assignedTo === 'SHARED_ALL_PEOPLE') {
      assignmentType = 'shared_all'
    } else if (item.assignedTo && poolMap.has(item.assignedTo)) {
      assignmentType = 'shared_group'
      sharedGroupId = poolMap.get(item.assignedTo) ?? null
    } else if (item.assignedTo && personMap.has(item.assignedTo)) {
      assignedToId = personMap.get(item.assignedTo) ?? null
    }

    return {
      billId: bill.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      assignedToId,
      assignmentType,
      sharedGroupId,
    }
  })

  if (itemsData.length > 0) {
    await prisma.billItem.createMany({ data: itemsData })
  }

  return NextResponse.json(bill)
}
