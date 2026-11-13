import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ComparePage } from '@/pages/ComparePage'
import { ExplorePage } from '@/pages/ExplorePage'
import { HomePage } from '@/pages/HomePage'
import { InvestigationPage } from '@/pages/InvestigationPage'
import { RankPage } from '@/pages/RankPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

// Views still marked PlaceholderPage are replaced by their real pages one by one.
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/investigations/:id', element: <InvestigationPage /> },
      { path: '/compare', element: <ComparePage /> },
      { path: '/rank', element: <RankPage /> },
      { path: '/ask', element: <PlaceholderPage title="Ask" note="Ask a question answered from cited sources." /> },
      { path: '*', element: <PlaceholderPage title="Lost in orbit" note="This page doesn’t exist." /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
