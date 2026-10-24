import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Loader2, RotateCcw } from 'lucide-react'
import { api, ANSWER_OPTIONS } from '../api/client'
import { useAsync } from '../hooks/useAsync'
import ConfidenceMeter from '../components/ConfidenceMeter'
import Skeleton from '../components/Skeleton'
import type { NextItemResponse } from '../types'

export default function QuizPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [state, setState] = useState<NextItemResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const resume = useAsync<NextItemResponse>(() => api.resumeQuiz(sessionId!), [sessionId])

  useEffect(() => {
    if (resume.data) setState(resume.data)
  }, [resume.data])

  const submitAnswer = useCallback(
    async (value: number) => {
      if (!sessionId || !state?.item || submitting) return
      setSubmitting(true)
      setActionError(null)
      try {
        const next = await api.answer(sessionId, state.item.id, value)
        setState(next)
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Could not record that answer.')
      } finally {
        setSubmitting(false)
      }
    },
    [sessionId, state, submitting],
  )

  const undo = useCallback(async () => {
    if (!sessionId || submitting) return
    setSubmitting(true)
    setActionError(null)
    try {
      const next = await api.undo(sessionId)
      setState(next)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not undo.')
    } finally {
      setSubmitting(false)
    }
  }, [sessionId, submitting])

  // Keyboard answers: keys 1-5
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (state?.done || !state?.item || submitting) return
      const value = Number(event.key)
      if (value >= 1 && value <= 5) {
        event.preventDefault()
        void submitAnswer(value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state, submitting, submitAnswer])

  if (resume.loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton />
        <p className="text-center text-sm text-slate-500">Restoring your quiz...</p>
      </div>
    )
  }

  if (resume.error) {
    return (
      <div className="mx-auto max-w-2xl card space-y-4 text-center">
        <p role="alert" className="text-rose-300">
          {resume.error.message}
        </p>
        <div className="flex justify-center gap-3">
          <button className="btn-ghost" onClick={resume.retry}>
            Try again
          </button>
          <button className="btn-primary" onClick={() => navigate('/start')}>
            Start a new quiz
          </button>
        </div>
      </div>
    )
  }

  if (!state) return null

  if (state.done) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <div className="card space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">Quiz complete</p>
          <h1 className="text-3xl font-extrabold">Your profile is ready</h1>
          <p className="text-slate-400">
            Answered {state.answeredCount} items. Confidence: {Math.round(state.confidence)}%. Your
            trait ranges and matches are computed from those answers only.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button className="btn-primary px-6 py-3 text-base" onClick={() => navigate('/profile')}>
            See my profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            className="btn-ghost px-6 py-3 text-base"
            onClick={() => navigate('/matches')}
          >
            Skip to matches
          </button>
        </div>
      </div>
    )
  }

  const item = state.item!

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ConfidenceMeter confidence={state.confidence} answeredCount={state.answeredCount} />

      <section className="card" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Statement {state.answeredCount + 1}
        </p>
        <h1 className="mt-3 min-h-[4.5rem] text-2xl font-bold leading-snug text-white sm:text-3xl">
          {item.text}
        </h1>

        <div className="mt-7 grid grid-cols-5 gap-2" role="group" aria-label="Answer options">
          {ANSWER_OPTIONS.map((option) => (
            <button
              key={option.value}
              className="btn-option"
              onClick={() => void submitAnswer(option.value)}
              disabled={submitting}
              aria-keyshortcuts={String(option.value)}
            >
              <span className="text-lg font-bold tabular-nums">{option.hint}</span>
              <span className="text-[11px] leading-tight text-slate-400">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-slate-500">Tip: press keys 1-5 on your keyboard.</p>
          <button className="btn-ghost" onClick={() => void undo()} disabled={submitting || state.answeredCount === 0}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Undo
          </button>
        </div>

        {submitting && (
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Recording...
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-rose-300">
            {actionError} You can tap the option again to retry.
          </p>
        )}
      </section>

      <p className="text-center text-xs text-slate-600">
        Items are public-domain IPIP Big Five markers. The next statement is chosen where your
        estimate is least certain - that is why the length varies.
      </p>
    </div>
  )
}
