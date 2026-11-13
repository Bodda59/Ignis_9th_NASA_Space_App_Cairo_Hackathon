import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ComparePage } from '@/pages/ComparePage'
import { EarthPage } from '@/pages/EarthPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { GravityPage } from '@/pages/GravityPage'
import { HomePage } from '@/pages/HomePage'
import { ArticlePage } from '@/pages/ArticlePage'
import { AskPage } from '@/pages/AskPage'
import { InvestigationPage } from '@/pages/InvestigationPage'
import { MissionPage } from '@/pages/MissionPage'
import { MoonwalkPage } from '@/pages/MoonwalkPage'
import { RankPage } from '@/pages/RankPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { KidsShell } from '@/features/kids/KidsShell'
import { KidsHome } from '@/pages/kids/KidsHome'
import { KidsExplore } from '@/pages/kids/KidsExplore'
import { KidsExperiment } from '@/pages/kids/KidsExperiment'
import { KidsQuiz } from '@/pages/kids/KidsQuiz'
import { KidsEarth } from '@/pages/kids/KidsEarth'
import { KidsGame } from '@/pages/kids/KidsGame'
import { KidsGames } from '@/pages/kids/KidsGames'
import { KidsDetective } from '@/pages/kids/KidsDetective'

const router = createBrowserRouter([
  {
    // Kids Lab: its own shell, look and navigation for ages 8–12
    path: '/kids',
    element: <KidsShell />,
    children: [
      { index: true, element: <KidsHome /> },
      { path: 'explore', element: <KidsExplore /> },
      { path: 'experiments/:id', element: <KidsExperiment /> },
      { path: 'game', element: <KidsGames /> },
      { path: 'game/patrol', element: <KidsGame /> },
      { path: 'game/detective', element: <KidsDetective /> },
      { path: 'quiz', element: <KidsQuiz /> },
      { path: 'earth', element: <KidsEarth /> },
    ],
  },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/investigations/:id', element: <InvestigationPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/rank', element: <RankPage /> },
      { path: '/ask', element: <AskPage /> },
      { path: '/article', element: <ArticlePage /> },
      { path: '/earth', element: <EarthPage /> },
      { path: '/gravity', element: <GravityPage /> },
      { path: '/mission', element: <MissionPage /> },
      { path: '/moonwalk', element: <MoonwalkPage /> },
      { path: '*', element: <PlaceholderPage title="Lost in orbit" note="This page doesn’t exist." /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
