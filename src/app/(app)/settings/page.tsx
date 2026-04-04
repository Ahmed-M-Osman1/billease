'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useUIStore } from '@/stores/ui-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { CURRENCIES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { Save, Download, Sun, Moon, Monitor } from 'lucide-react'
import type { ThemePreference } from '@/lib/types'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useUIStore()
  const { toast } = useToast()
  const [currency, setCurrency] = useState('EGP')

  const handleExportJSON = async () => {
    const res = await fetch('/api/bills')
    const bills = await res.json()
    const blob = new Blob([JSON.stringify(bills, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'billease-export.json'
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Data exported' })
  }

  const themeOptions: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={session?.user?.name ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={session?.user?.email ?? ''} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(value)}
                  className="gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader><CardTitle className="text-sm">Data</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="h-4 w-4 mr-1" />
            Export all data as JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">About</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">BillEase v2.0.0 — AI-powered bill splitting</p>
        </CardContent>
      </Card>
    </div>
  )
}
