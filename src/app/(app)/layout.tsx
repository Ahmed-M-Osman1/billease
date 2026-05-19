'use client'

import { useEffect, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileFAB } from '@/components/mobile-fab'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const { setUser, setProfile, setLoading } = useAuthStore()
  const { sidebarCollapsed, setSidebarOpen } = useUIStore()

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true)
    } else if (session?.user) {
      setUser(session.user as any)
      setProfile({
        id: (session.user as any).id ?? '',
        full_name: session.user.name ?? '',
        avatar_url: session.user.image ?? null,
        currency: 'EGP',
        theme: 'system',
        created_at: '',
        updated_at: '',
      })
    } else {
      setUser(null)
      setLoading(false)
    }
  }, [session, status])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          'lg:ml-60',
          sidebarCollapsed && 'lg:ml-16'
        )}
      >
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      <MobileFAB />
    </div>
  )
}
