import { Link, NavLink } from 'react-router-dom'
import { Compass } from 'lucide-react'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            Persona<span className="text-indigo-400">Connect</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/start"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              Start quiz
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              Profile
            </NavLink>
            <NavLink
              to="/matches"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              Matches
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 transition ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`
              }
            >
              History
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-800/80 px-4 py-6 text-xs text-slate-500">
        <div className="mx-auto max-w-5xl space-y-1">
          <p>
            Persona-Connect is a self-reflection tool, not a clinical or hiring assessment. Role-model
            traits are AI-estimated from public text.
          </p>
          <p>
            Biography text is sourced from Wikipedia (CC BY-SA). Quiz items are public-domain IPIP
            markers. Mock data build - no server required.
          </p>
        </div>
      </footer>
    </div>
  )
}
