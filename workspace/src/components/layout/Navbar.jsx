import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  Plus,
  Sun,
  Moon,
  LogOut,
  UserRound, // Icon used for the user profile.
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

function Navbar() {
  const navigate = useNavigate()

  // Read the saved theme when the Navbar first loads.
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('workspace-theme') === 'dark'
  })

  // Track logout progress and any logout error.
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')

  // Apply the selected theme to the entire application.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)

    localStorage.setItem(
      'workspace-theme',
      darkMode ? 'dark' : 'light'
    )
  }, [darkMode])

  // Switch between light mode and dark mode.
  function toggleDarkMode() {
    setDarkMode((currentMode) => !currentMode)
  }

  // Sign out of Supabase and return to the login page.
  async function handleLogout() {
    setError('')
    setLoggingOut(true)

    try {
      const { error } = await supabase.auth.signOut()

      // Display an error if Supabase cannot sign out the user.
      if (error) {
        setError(error.message)
        return
      }

      // Replace the current page with the login page.
      navigate('/login', { replace: true })
    } catch {
      setError('Unable to log out. Please try again.')
    } finally {
      // Re-enable the logout button after the operation finishes.
      setLoggingOut(false)
    }
  }

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 transition-colors dark:border-slate-700 dark:bg-slate-900 sm:px-6">
      {/* Application name */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
          Workspace
        </h2>
      </div>

      {/* Navbar actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 sm:flex">
          <Search size={18} className="text-slate-400" />

          <input
            type="text"
            placeholder="Search anything..."
            aria-label="Search anything"
            className="w-32 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 sm:w-48"
          />
        </div>

        {/* Navigate to the projects page to create or manage projects */}
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Create New</span>
        </button>

        {/* Navigate to notifications */}
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          title="Notifications"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell size={20} />
        </button>

        {/* Switch between light and dark themes */}
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={
            darkMode ? 'Switch to light mode' : 'Switch to dark mode'
          }
          title={
            darkMode ? 'Switch to light mode' : 'Switch to dark mode'
          }
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Open the user's profile page */}
        <button
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Open user profile"
          title="User Profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
        >
          <UserRound size={19} />
        </button>

        {/* Sign out of the current account */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Logout"
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">
            {loggingOut ? 'Logging out...' : 'Logout'}
          </span>
        </button>
      </div>

      {/* Display logout errors */}
      {error && (
        <div
          role="alert"
          className="absolute right-4 top-14 z-50 max-w-sm rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-600 shadow-lg dark:border-red-900 dark:bg-slate-800 dark:text-red-300"
        >
          {error}
        </div>
      )}
    </header>
  )
}

export default Navbar