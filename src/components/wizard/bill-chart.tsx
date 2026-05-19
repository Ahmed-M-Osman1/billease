'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { CalculatedPersonSummary } from '@/lib/types'
import { PERSON_COLORS } from '@/lib/constants'

interface BillChartProps {
  summaries: CalculatedPersonSummary[]
  currency: string
}

export function BillChart({ summaries, currency }: BillChartProps) {
  const data = summaries.map((s, i) => ({
    name: s.name,
    value: parseFloat(s.totalDue.toFixed(2)),
    color: PERSON_COLORS[i % PERSON_COLORS.length],
  }))

  if (data.length === 0) return null

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${currency} ${value.toFixed(2)}`, 'Amount']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
