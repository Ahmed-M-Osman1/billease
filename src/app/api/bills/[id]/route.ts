import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      participants: true,
      items: true,
      splitGroups: { include: { members: true } },
      settlements: true,
    },
  })

  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(bill)
}
