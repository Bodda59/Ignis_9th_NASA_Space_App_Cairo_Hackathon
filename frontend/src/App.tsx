import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

// Every view is a placeholder for now; the real pages replace these one by one.
const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <PlaceholderPage title="Flame in Freefall" note="The landing page is on its way." /> },
      { path: '/explore', element: <PlaceholderPage title="Explore" note="Search and filter the combustion studies." /> },
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
