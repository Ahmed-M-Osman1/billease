'use client'

import Link from 'next/link'
import { ArrowRight, Receipt, Sparkles, Upload, Users } from 'lucide-react'
import { NewBillWizard } from '@/components/wizard/new-bill-wizard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const highlights = [
  {
    icon: Upload,
    title: 'Scan in seconds',
    description: 'Upload a receipt photo and let OCR pull out the line items for you.',
  },
  {
    icon: Users,
    title: 'Add names fast',
    description: 'Type your group once, then split with individual and shared assignments.',
  },
  {
    icon: Sparkles,
    title: 'Modern guest flow',
    description: 'Use the same polished wizard as signed-in users, without the login wall.',
  },
]

export default function GuestBillPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_38%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.45))]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border bg-background/80 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">BillEase Guest Mode</p>
              <h1 className="text-xl font-semibold tracking-tight">Split a bill without signing in</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/auth/login?callbackUrl=/bill/new">
                Sign in to save bills
              </Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup?callbackUrl=/bill/new">
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 rounded-[2rem] border bg-card/85 p-6 shadow-sm backdrop-blur sm:p-8">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              New UI, guest-friendly flow
            </Badge>
            <div className="space-y-3">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Upload the receipt, add your people, and finish the split before anyone creates an account.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Guest mode keeps everything in this browser, so you can scan and calculate right away.
                When you want saved history and shareable bills, sign in and keep going with the same wizard.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {highlights.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title} className="border-white/60 bg-background/85 shadow-sm backdrop-blur">
                  <CardContent className="flex gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <main className="rounded-[2rem] border bg-background/90 p-4 shadow-xl backdrop-blur sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl space-y-3 pb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Guest bill splitter</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              You can scan, assign, and export without login. Saving to history and collaboration links
              still require an account.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <NewBillWizard mode="guest" />
          </div>
        </main>
      </div>
    </div>
  )
}
