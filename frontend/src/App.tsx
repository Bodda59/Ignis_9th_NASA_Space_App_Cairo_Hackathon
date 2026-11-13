import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ComparePage } from '@/pages/ComparePage'
import { EarthPage } from '@/pages/EarthPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { HomePage } from '@/pages/HomePage'
import { ArticlePage } from '@/pages/ArticlePage'
import { AskPage } from '@/pages/AskPage'
import { InvestigationPage } from '@/pages/InvestigationPage'
import { MissionPage } from '@/pages/MissionPage'
import { MoonwalkPage } from '@/pages/MoonwalkPage'
import { RankPage } from '@/pages/RankPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

const router = createBrowserRouter([
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
      { path: '/mission', element: <MissionPage /> },
      { path: '/moonwalk', element: <MoonwalkPage /> },
      { path: '*', element: <PlaceholderPage title="Lost in orbit" note="This page doesn’t exist." /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
