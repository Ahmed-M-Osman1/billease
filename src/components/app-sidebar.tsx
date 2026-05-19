'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Receipt,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bill/new', label: 'New Bill', icon: PlusCircle },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore()
  const { profile } = useAuthStore()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  async function handleLogout() {
    await signOut({ callbackUrl: '/auth/login' })
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r bg-card transition-all duration-300',
          // Desktop
          'hidden lg:flex',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-60',
          // Mobile overlay
          sidebarOpen && '!flex w-72'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-3">
          {(!sidebarCollapsed || sidebarOpen) && (
            <Link href="/" className="flex items-center gap-2 font-bold text-primary">
              <Receipt className="h-6 w-6" />
              <span className="text-lg">BillEase</span>
            </Link>
          )}
          {sidebarCollapsed && !sidebarOpen && (
            <Link href="/" className="mx-auto">
              <Receipt className="h-6 w-6 text-primary" />
            </Link>
          )}
          {/* Close button on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {(!sidebarCollapsed || sidebarOpen) && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User section */}
        <div className="p-2">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2',
              sidebarCollapsed && !sidebarOpen && 'justify-center px-0'
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {(!sidebarCollapsed || sidebarOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name ?? 'User'}
                </p>
              </div>
            )}
            {(!sidebarCollapsed || sidebarOpen) && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex justify-center pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </>
  )
}
