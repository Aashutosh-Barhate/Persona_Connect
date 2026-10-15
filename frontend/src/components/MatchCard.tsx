import { Link } from 'react-router-dom'
import type { Match } from '../types'

interface MatchCardProps {
  match: Match
}

export default function MatchCard({ match }: MatchCardProps) {
  const { biography, explanation, score, confidenceLabel, rank } = match

  return (
    <Link
      to={`/matches/${biography.id}`}
      className="card block transition hover:border-indigo-500/60 hover:bg-slate-800/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-xs font-bold text-indigo-400">#{rank}</span>
            <h3 className="text-lg font-bold text-white">{biography.name}</h3>
          </div>
          <p className="mt-0.5 text-xs capitalize text-slate-500">
            {biography.domain}
            {biography.birthYear ? ` · b. ${biography.birthYear}` : ''} · {biography.nationality}
          </p>
        </div>
        <div className="text-right">
          <div className="tabular-nums text-2xl font-extrabold text-indigo-400">
            {(score * 100).toFixed(0)}
            <span className="text-sm text-slate-500">/100</span>
          </div>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              confidenceLabel === 'High'
                ? 'bg-emerald-500/15 text-emerald-300'
                : confidenceLabel === 'Medium'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-slate-700/60 text-slate-300'
            }`}
          >
            {confidenceLabel} confidence
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{explanation.text}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {explanation.sharedDomains.slice(0, 3).map((domain) => (
          <span key={domain} className="chip border-indigo-700/60 text-indigo-200">
            {domain.replace(/-/g, ' ')}
          </span>
        ))}
        {explanation.sharedDomains.length === 0 && <span className="chip">personality shape match</span>}
      </div>
    </Link>
  )
}
