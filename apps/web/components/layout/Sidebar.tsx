'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, GitBranch, Play, DollarSign,
  Settings, Cpu, Wrench, PenSquare, LogOut, Bell, BarChart2,
} from 'lucide-react'
import { signOut, useSession } from '@/lib/auth-client'

const NAV = [
  { label: 'Overview',  href: '/overview',   icon: LayoutDashboard },
  { label: 'Pipelines', href: '/pipelines',  icon: GitBranch },
  { label: 'Builder',   href: '/builder',    icon: PenSquare },
  { label: 'Runs',      href: '/runs',       icon: Play },
  { label: 'Agents',    href: '/agents',     icon: Cpu },
  { label: 'Tools',     href: '/tools',      icon: Wrench },
  { label: 'Cost',      href: '/cost',       icon: DollarSign },
  { label: 'Usage',     href: '/usage',      icon: BarChart2 },
  { label: 'Alerts',    href: '/alerts',     icon: Bell      },
  { label: 'Settings',  href: '/settings',   icon: Settings  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      background: '#111114',
      borderRight: '1px solid #27272a',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #27272a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'linear-gradient(135deg, #7c6aff, #4f3fcc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff',
          }}>A</div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>AgentForge</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 12px', borderRadius: '6px',
              fontSize: '12px', fontWeight: active ? 500 : 400,
              color: active ? '#e4e4e7' : '#71717a',
              background: active ? '#18181c' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.1s',
            }}>
              <Icon size={14} style={{ color: active ? '#7c6aff' : '#52525b' }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {session?.user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', color: '#7c6aff', fontWeight: 700, flexShrink: 0,
            }}>{session.user.name?.[0]?.toUpperCase() ?? '?'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.name}</div>
              <div style={{ fontSize: '9px', color: '#52525b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user.email}</div>
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#52525b', flexShrink: 0 }}>
              <LogOut size={12} />
            </button>
          </div>
        )}
        <span style={{ fontSize: '10px', color: '#3f3f46', letterSpacing: '0.05em' }}>v0.1.0 · dev</span>
      </div>
    </aside>
  )
}
