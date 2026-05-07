import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Users, Briefcase, Building2,
  Upload, LogOut, Menu, X, Bell
} from 'lucide-react'
import { useState } from 'react'
import LanguageSwitcher from './LanguageSwitcher'

export default function Layout() {
  const logout    = useAuthStore((s) => s.logout)
  const user      = useAuthStore((s) => s.user)
  const navigate  = useNavigate()
  const { t }     = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const NAV_ITEMS = [
    { to: '/dashboard',        icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/candidats',        icon: Users,           label: t('nav.candidates') },
    { to: '/encarrecs',        icon: Briefcase,       label: t('nav.assignments') },
    { to: '/clients',          icon: Building2,       label: t('nav.clients') },
    { to: '/candidats/upload', icon: Upload,          label: t('nav.uploadCv') },
  ]

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-primary-800 flex flex-col transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-primary-700">
          <div className="w-9 h-9 bg-accent-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-lg">CV</span>
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">CV Hunter</div>
          </div>
          <button className="ml-auto lg:hidden text-primary-200 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-accent-500/30 text-white border-l-2 border-accent-400'
                  : 'text-primary-200 hover:bg-white/10 hover:text-white'}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Usuari + selector d'idioma */}
        <div className="px-4 py-4 border-t border-primary-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user?.nom?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{user?.nom || 'Usuari'}</div>
              <div className="text-primary-300 text-xs capitalize">{user?.rol || ''}</div>
            </div>
          </div>
          <div className="mb-2">
            <LanguageSwitcher dark />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-primary-200 hover:text-white text-sm w-full px-2 py-1.5 rounded hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Overlay mòbil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Contingut principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <button className="relative text-gray-400 hover:text-gray-600">
            <Bell size={20} />
          </button>
        </header>

        {/* Pàgina */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
