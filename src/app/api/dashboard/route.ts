import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 })

  const userId = session.user.id
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [recentBills, monthlyBills] = await Promise.all([
    prisma.bill.findMany({
      where: { userId },
      include: { participants: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.bill.findMany({
      where: { userId, createdAt: { gte: startOfMonth } },
      select: { subtotal: true, vat: true, serviceCharge: true, delivery: true, tip: true },
    }),
  ])

  const count = monthlyBills.length
  const totalSpent = monthlyBills.reduce(
    (sum, b) => sum + b.subtotal + b.vat + b.serviceCharge + b.delivery + b.tip,
    0
  )

  return NextResponse.json({
    recentBills,
    stats: { count, totalSpent, avgBill: count > 0 ? totalSpent / count : 0 },
  })
}
