import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import StartPage from './pages/StartPage'
import QuizPage from './pages/QuizPage'
import ProfilePage from './pages/ProfilePage'
import MatchesPage from './pages/MatchesPage'
import MatchDetailPage from './pages/MatchDetailPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/quiz/:sessionId" element={<QuizPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/matches/:biographyId" element={<MatchDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
