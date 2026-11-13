import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ExplorePage } from '@/pages/ExplorePage'
import { HomePage } from '@/pages/HomePage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

// Views still marked PlaceholderPage are replaced by their real pages one by one.
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/investigations/:id', element: <PlaceholderPage title="Investigation" note="Study details, findings and data." /> },
      { path: '/compare', element: <PlaceholderPage title="Compare" note="Line up two or three studies side by side." /> },
      { path: '/rank', element: <PlaceholderPage title="Rank" note="Rank research evidence for a question or scenario." /> },
      { path: '/ask', element: <PlaceholderPage title="Ask" note="Ask a question answered from cited sources." /> },
      { path: '*', element: <PlaceholderPage title="Lost in orbit" note="This page doesn’t exist." /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
