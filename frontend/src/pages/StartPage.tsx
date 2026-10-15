import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { mockApi } from '../api/mockApi'
import type { ThemeOption } from '../types'

export default function StartPage() {
  const navigate = useNavigate()
  const [ageRange, setAgeRange] = useState('')
  const [careerPhase, setCareerPhase] = useState('')
  const [themes, setThemes] = useState<string[]>([])
  const [goal, setGoal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function toggleTheme(theme: ThemeOption) {
    setThemes((current) => {
      if (current.includes(theme.id)) return current.filter((id) => id !== theme.id)
      if (current.length >= 3) return current
      return [...current, theme.id]
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!ageRange) {
      setError('Pick the age range that fits you.')
      return
    }
    if (!careerPhase) {
      setError('Pick the career phase that fits you.')
      return
    }
    if (themes.length < 1) {
      setError('Choose at least one theme you are working on.')
      return
    }

    setSubmitting(true)
    try {
      const response = await mockApi.startQuiz({ ageRange, careerPhase, themes, goal })
      navigate(`/quiz/${response.sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the quiz.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Before the questions</h1>
        <p className="mt-2 text-slate-400">
          Two minutes of context makes the matching far more personal. It is stored with your session
          only - no account, no email.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-7" noValidate>
        <fieldset>
          <legend className="label">Age range</legend>
          <div className="flex flex-wrap gap-2">
            {mockApi.meta.lifeStages.map((stage) => (
              <button
                key={stage}
                type="button"
                aria-pressed={ageRange === stage}
                onClick={() => setAgeRange(stage)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  ageRange === stage
                    ? 'border-indigo-400 bg-indigo-500/15 text-white'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Career phase</legend>
          <div className="flex flex-wrap gap-2">
            {mockApi.meta.careerPhases.map((phase) => (
              <button
                key={phase}
                type="button"
                aria-pressed={careerPhase === phase}
                onClick={() => setCareerPhase(phase)}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  careerPhase === phase
                    ? 'border-indigo-400 bg-indigo-500/15 text-white'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {phase}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">
            What are you working on right now? <span className="font-normal text-slate-500">(pick up to 3)</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {mockApi.meta.themes.map((theme) => {
              const active = themes.includes(theme.id)
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTheme(theme)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-indigo-400 bg-indigo-500/15'
                      : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">{theme.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{theme.description}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="goal">
            Anything specific on your mind? <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="goal"
            rows={3}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="e.g. I want to lead a team without losing my own creative practice"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200 placeholder:text-slate-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            Used only to sharpen your matches in this browser. Never logged, never sent anywhere.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-700/50 bg-rose-950/40 p-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Starting...
            </>
          ) : (
            <>
              Start the quiz <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
