'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Monitor } from 'lucide-react'
import type { ThemePreference } from '@/lib/types'

const themeIcons: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const themeOrder: ThemePreference[] = ['light', 'dark', 'system']

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(systemDark ? 'dark' : 'light')
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  const cycle = () => {
    const currentIndex = themeOrder.indexOf(theme)
    const next = themeOrder[(currentIndex + 1) % themeOrder.length]
    setTheme(next)
  }

  const Icon = themeIcons[theme]

  return (
    <Button variant="ghost" size="icon" onClick={cycle} className="h-8 w-8">
      <Icon className="h-4 w-4" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
