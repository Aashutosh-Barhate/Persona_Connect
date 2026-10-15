import { useState } from 'react'
import { Star } from 'lucide-react'

interface RatingFormProps {
  biographyName: string
  onSubmit: (rating: number, comment: string) => Promise<void>
}

export default function RatingForm({ biographyName, onSubmit }: RatingFormProps) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (rating < 1 || rating > 5) {
      setError('Pick a star rating first.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(rating, comment.trim())
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 text-sm text-emerald-200">
        Thanks - your rating for {biographyName} was recorded offline. Ratings feed the weight refit
        notebook; weights are never changed live.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Rate ${value} of 5`}
            className="rounded p-1 transition hover:scale-110"
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(value)}
          >
            <Star
              className={`h-7 w-7 ${
                value <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-400">
          {rating > 0 ? `${rating}/5` : 'How relatable is this person?'}
        </span>
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        placeholder="Optional: what resonated (or did not)?"
        className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200 placeholder:text-slate-600"
      />

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Saving...' : 'Submit rating'}
      </button>
    </form>
  )
}
