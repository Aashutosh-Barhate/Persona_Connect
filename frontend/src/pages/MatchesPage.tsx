import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockApi, getCurrentSessionId } from '../api/mockApi'
import { useAsync } from '../hooks/useAsync'
import MatchCard from '../components/MatchCard'
import Disclosure from '../components/Disclosure'
import { SkeletonCard } from '../components/Skeleton'
import type { Match } from '../types'

const INITIAL_COUNT = 5

export default function MatchesPage() {
  const navigate = useNavigate()
  const sessionId = getCurrentSessionId()
  const [expanded, setExpanded] = useState(false)

  const matches = useAsync<Match[]>(() => mockApi.getMatches(sessionId!), [sessionId])

  if (!sessionId) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">No active quiz</h1>
        <p className="text-slate-400">Take the quiz first and your matches will appear here.</p>
        <button className="btn-primary mx-auto" onClick={() => navigate('/start')}>
          Start the quiz
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Your role models</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Five picks from twenty candidates, re-ranked for diversity (at most two per domain, at
          least one outside the most-famous tier). Confidence comes from how often each person stays
          in your top five when your quiz answers are re-sampled.
        </p>
      </header>

      <Disclosure />

      {matches.loading && (
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {matches.error && (
        <div className="card space-y-4 text-center">
          <p role="alert" className="text-rose-300">
            {matches.error.message}
          </p>
          <button className="btn-ghost mx-auto" onClick={matches.retry}>
            Try again
          </button>
        </div>
      )}

      {matches.data && (
        <>
          <div className="grid gap-4">
            {(expanded ? matches.data : matches.data.slice(0, INITIAL_COUNT)).map((match) => (
              <MatchCard key={match.biography.id} match={match} />
            ))}
          </div>

          {matches.data.length > INITIAL_COUNT && (
            <div className="text-center">
              <button className="btn-ghost" onClick={() => setExpanded((value) => !value)}>
                {expanded
                  ? 'Show fewer'
                  : `Show ${matches.data.length - INITIAL_COUNT} more matches`}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-slate-600">
            Scores: 0.30 personality + 0.15 tendencies + 0.20 domains + 0.20 context + 0.15 text
            similarity. Weights live in a versioned file, never in code.
          </p>
        </>
      )}
    </div>
  )
}
