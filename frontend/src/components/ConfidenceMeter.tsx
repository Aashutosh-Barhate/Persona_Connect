interface ConfidenceMeterProps {
  confidence: number
  answeredCount: number
  total?: number
}

/**
 * Deliberately shows REMAINING UNCERTAINTY (as confidence %) instead of
 * "question 7 of 30" - the quiz length is adaptive, not fixed.
 */
export default function ConfidenceMeter({ confidence, answeredCount }: ConfidenceMeterProps) {
  const rounded = Math.round(confidence)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-slate-300">Confidence</span>
        <span className="tabular-nums text-slate-400">
          {rounded}% <span className="text-slate-600">({answeredCount} answered)</span>
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Quiz confidence"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-500"
          style={{ width: `${rounded}%` }}
        />
      </div>
    </div>
  )
}
