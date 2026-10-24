import { Link, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { listHistory, openSession } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import { themeLabel } from '../data/mockData'
import type { HistoryEntry } from '../types'

export default function HistoryPage() {
  const navigate = useNavigate()
  const history = useAsync<HistoryEntry[]>(async () => listHistory(), [])

  function openEntry(entry: HistoryEntry) {
    try {
      openSession(entry.sessionId)
      navigate('/profile')
    } catch {
      window.alert('That session is no longer available in this browser.')
    }
  }

  function clearAll() {
    localStorage.removeItem('pc_history')
    Object.keys(localStorage)
      .filter((key) => key.startsWith('pc_session_') || key.startsWith('pc_matches_'))
      .forEach((key) => localStorage.removeItem(key))
    sessionStorage.removeItem('pc_current_session')
    history.retry()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your sessions</h1>
          <p className="mt-2 text-slate-400">
            Stored only in this browser. Guest data is deleted after 30 days in the hosted version -
            here you can wipe it instantly.
          </p>
        </div>
        {history.data && history.data.length > 0 && (
          <button className="btn-ghost" onClick={clearAll}>
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete all
          </button>
        )}
      </header>

      {history.loading && <p className="text-sm text-slate-500">Loading...</p>}

      {history.data && history.data.length === 0 && (
        <div className="card space-y-4 text-center">
          <p className="text-slate-400">No sessions yet.</p>
          <Link to="/start" className="btn-primary mx-auto">
            Start the quiz
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {history.data?.map((entry) => (
          <article key={entry.sessionId} className="card flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {entry.answeredCount} answers · {entry.lifeStage} · {entry.careerPhase}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.themes.map((theme) => (
                  <span key={theme} className="chip">
                    {themeLabel(theme)}
                  </span>
                ))}
              </div>
            </div>
            <button className="btn-ghost" onClick={() => openEntry(entry)}>
              Open
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
