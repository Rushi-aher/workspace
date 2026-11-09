import {
  createBrowserRouter,
  Navigate,
} from 'react-router-dom'

import MainLayout from '../components/layout/MainLayout'

import Login from '../features/auth/Login'
import Signup from '../features/auth/Signup'
import PublicRoute from '../features/auth/PublicRoute'
import ProtectedRoute from '../features/auth/ProtectedRoute'
import Profile from '../features/profile/Profile'
import Teams from '../features/teams/Teams'
import Tickets from '../features/tickets/Tickets'
import Dashboard from '../features/dashboard/Dashboard'

import CreateJoinWorkspace from '../features/workspaces/CreateJoinWorkspace'
import WorkspaceRedirect from '../features/workspaces/WorkspaceRedirect'

function Page({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
        {title}
      </h1>

      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Welcome to the {title} page.
      </p>
    </div>
  )
}

const router = createBrowserRouter([
  // Pages available only when logged out
  {
    element: <PublicRoute />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/signup',
        element: <Signup />,
      },
    ],
  },

  // Pages available only when logged in
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <Dashboard />,
          },
          {
            path: 'tickets',
            element: <Tickets />,
          },
          {
            path: 'kanban',
            element: <Page title="Kanban Board" />,
          },
          {
            path: 'comments',
            element: <Page title="Comments" />,
          },
          {
            path: 'teams',
            element: <Teams />,
          },
          {
            path: 'activity',
            element: <Page title="Activity" />,
          },
          {
            path: 'notifications',
            element: <Page title="Notifications" />,
          },
          {
            path: 'workspaces/new',
            element: <CreateJoinWorkspace />,
          },
          {
            path: 'profile',
            element: <Profile />,
          },
        ],
      },
    ],
  },
])

export default router