import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Flag, MessageSquareQuote } from 'lucide-react'
import { mockApi, TRAIT_LABELS, TRAIT_ORDER, getCurrentSessionId } from '../api/mockApi'
import { useAsync } from '../hooks/useAsync'
import TraitRangeBar from '../components/TraitRangeBar'
import ScoreBreakdown from '../components/ScoreBreakdown'
import RatingForm from '../components/RatingForm'
import Disclosure from '../components/Disclosure'
import Skeleton from '../components/Skeleton'
import { challengeLabel, themeLabel } from '../data/mockData'
import type { Match } from '../types'

export default function MatchDetailPage() {
  const { biographyId } = useParams<{ biographyId: string }>()
  const navigate = useNavigate()
  const sessionId = getCurrentSessionId()

  const matches = useAsync<Match[]>(
    () => mockApi.getMatches(sessionId!),
    [sessionId],
  )

  const profile = useAsync(() => mockApi.getProfile(sessionId!), [sessionId])

  if (!sessionId) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">No active quiz</h1>
        <p className="text-slate-400">Matches need a finished quiz.</p>
        <button className="btn-primary mx-auto" onClick={() => navigate('/start')}>
          Start the quiz
        </button>
      </div>
    )
  }

  if (matches.loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton />
      </div>
    )
  }

  if (matches.error) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <p role="alert" className="text-rose-300">
          {matches.error.message}
        </p>
        <button className="btn-ghost mx-auto" onClick={matches.retry}>
          Try again
        </button>
      </div>
    )
  }

  const match = matches.data?.find((item) => item.biography.id === Number(biographyId))
  if (!match) {
    return (
      <div className="card mx-auto max-w-xl space-y-4 text-center">
        <h1 className="text-2xl font-bold">Match not found</h1>
        <p className="text-slate-400">This biography is not in your current match list.</p>
        <Link to="/matches" className="btn-primary mx-auto">
          Back to matches
        </Link>
      </div>
    )
  }

  const { biography, explanation, breakdown, score, confidence, confidenceLabel } = match
  const talkUrl = biography.sourceUrl.replace('/wiki/', '/wiki/Talk:')

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/matches" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        &larr; All matches
      </Link>

      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              Rank #{match.rank} · {biography.domain}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">{biography.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {biography.birthYear ?? '?'}
              {biography.deathYear ? `-${biography.deathYear}` : ''} · {biography.nationality} ·
              estimates from public text, confidence {biography.traitConfidence.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <div className="tabular-nums text-4xl font-extrabold text-indigo-400">
              {(score * 100).toFixed(0)}
              <span className="text-base text-slate-500">/100</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {confidenceLabel} confidence · {Math.round(confidence * 100)}% top-5 stability
            </p>
          </div>
        </div>

        <p className="mt-4 leading-relaxed text-slate-300">{biography.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <a href={biography.sourceUrl} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !text-xs">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Read on Wikipedia
          </a>
          <a href={talkUrl} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !text-xs">
            <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Report an error
          </a>
          <span>Text licensed CC BY-SA.</span>
        </div>
      </header>

      <section className="card">
        <h2 className="mb-4 font-bold text-white">Why this match</h2>
        <ScoreBreakdown breakdown={breakdown} total={score} />
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold text-white">What you share</h2>
        {explanation.sharedTraits.length > 0 ? (
          <ul className="space-y-2">
            {explanation.sharedTraits.map((fact) => (
              <li key={fact.trait} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-semibold text-white">{fact.label}</span>
                <span className="tabular-nums text-slate-400">
                  you {fact.userValue} · {biography.name} {fact.bioValue}
                </span>
                <span className="text-xs text-emerald-300">{fact.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            No strong shared high/low traits - the match is driven by domains and context.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Shared domains</h3>
            {explanation.sharedDomains.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {explanation.sharedDomains.map((domain) => (
                  <span key={domain} className="chip border-indigo-700/60 text-indigo-200">
                    {themeLabel(domain)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">None selected by you.</p>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">Challenges they faced</h3>
            {biography.challenges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {biography.challenges.map((challenge) => (
                  <span key={challenge} className="chip border-amber-700/60 text-amber-200/90">
                    {challengeLabel(challenge)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nothing strong detected in public text.</p>
            )}
          </div>
        </div>

        {explanation.difference && (
          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
            <MessageSquareQuote className="mr-1.5 inline h-4 w-4 text-amber-400" aria-hidden="true" />
            <strong>Honest difference:</strong> the biggest gap is {explanation.difference.label} -
            you are at {explanation.difference.userValue}, {biography.name} is estimated at{' '}
            {explanation.difference.bioValue} ({explanation.difference.gap} points apart).
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-4 font-bold text-white">Trait-by-trait</h2>
        <div className="space-y-5">
          {TRAIT_ORDER.map((trait) => (
            <TraitRangeBar
              key={trait}
              label={TRAIT_LABELS[trait]}
              value={biography.traits[trait]}
              sd={8}
              blurb={`bar = ${biography.name} estimate · gold marker = you`}
              compare={profile.data ? { name: 'You', value: profile.data.traits[trait] } : null}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold text-white">How relatable did this feel?</h2>
        <RatingForm
          biographyName={biography.name}
          onSubmit={async (rating, comment) => {
            await mockApi.submitFeedback({
              sessionId,
              biographyId: biography.id,
              rating,
              comment,
              breakdown,
            })
          }}
        />
      </section>

      <Disclosure />
    </div>
  )
}
