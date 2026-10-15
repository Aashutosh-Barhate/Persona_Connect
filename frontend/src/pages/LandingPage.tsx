import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, ListChecks, MessagesSquare, ShieldCheck } from 'lucide-react'
import Disclosure from '../components/Disclosure'

const FEATURES = [
  {
    icon: ListChecks,
    title: 'Adaptive quiz, not 50 questions',
    body: 'The engine asks what it is least sure about and stops when your trait ranges are stable. You see a confidence meter, not a question counter.',
  },
  {
    icon: BrainCircuit,
    title: 'Honest ranges, not scores',
    body: 'Your profile is five trait bands and four preference sliders. We show the uncertainty because a 12-item estimate deserves it.',
  },
  {
    icon: MessagesSquare,
    title: 'Explained matches',
    body: 'Every role model comes with the exact similarity components, the traits you share, and one honest difference. No black-box "97% match".',
  },
]

export default function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="py-6 text-center">
        <span className="chip mx-auto mb-5 border-indigo-700/60 text-indigo-200">
          Self-reflection · public-domain items · open data
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Find role models who <span className="text-indigo-400">actually feel like you</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-400">
          Persona-Connect runs a short adaptive personality quiz, then matches you with real
          biographies - scientists, artists, leaders, athletes - whose estimated traits, life domains
          and hard chapters overlap with yours.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/start" className="btn-primary px-6 py-3 text-base">
            Start the quiz <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/history" className="btn-ghost px-6 py-3 text-base">
            Resume a past session
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">No account needed. Works as a guest.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="card">
            <feature.icon className="h-7 w-7 text-indigo-400" aria-hidden="true" />
            <h2 className="mt-3 font-bold text-white">{feature.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          How this treats you
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
          <li>Quiz answers never leave your browser in this build.</li>
          <li>Free-text goals are optional and never logged anywhere.</li>
          <li>Role-model traits are estimates from public text, labelled as such.</li>
          <li>Biography text is CC BY-SA from Wikipedia and attributed on every match.</li>
          <li>Not a diagnostic instrument and not for hiring decisions.</li>
          <li>You can delete your session at any time from the history page.</li>
        </ul>
      </section>

      <Disclosure />
    </div>
  )
}
