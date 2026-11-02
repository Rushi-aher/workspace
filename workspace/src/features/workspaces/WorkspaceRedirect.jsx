import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  FolderKanban,
  Users,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

function WorkspaceRedirect() {
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadWorkspace() {
      try {
        setLoading(true)
        setError('')

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError

        if (!user) {
          if (active) {
            setError('Your session has expired. Please log in again.')
          }
          return
        }

        const { data: memberships, error: membershipError } =
          await supabase
            .from('workspace_members')
            .select('workspace_id, role, joined_at')
            .eq('user_id', user.id)
            .order('joined_at', { ascending: false })
            .limit(1)

        if (membershipError) throw membershipError

        if (!memberships || memberships.length === 0) {
          if (active) setWorkspace(null)
          return
        }

        const membership = memberships[0]

        const { data: workspaceData, error: workspaceError } =
          await supabase
            .from('workspaces')
            .select('id, name, description, created_at')
            .eq('id', membership.workspace_id)
            .single()

        if (workspaceError) throw workspaceError

        if (active) {
          setWorkspace({
            ...workspaceData,
            role: membership.role,
            joined_at: membership.joined_at,
          })
        }
      } catch (err) {
        console.error('Dashboard loading error:', err)

        if (active) {
          setError(
            err.message || 'Unable to load your workspace.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadWorkspace()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 transition-colors dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Loading your workspace...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-full bg-slate-50 p-6 transition-colors dark:bg-slate-950">
        <div
          role="alert"
          className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <h2 className="font-semibold">
            Unable to load your workspace
          </h2>

          <p className="mt-2 text-sm">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return <Navigate to="/workspaces/new" replace />
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 transition-colors dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Workspace / Overview
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Welcome back! Here is an overview of your workspace.
          </p>
        </div>

        {/* Workspace information */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <FolderKanban size={28} />
              </div>

              <div className="min-w-0">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your workspace
                </p>

                <h2 className="mt-1 break-words text-2xl font-bold text-slate-900 dark:text-white">
                  {workspace.name}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {workspace.description ||
                    'No workspace description has been added yet.'}
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 size={16} />
              Active
            </span>
          </div>

          <div className="grid border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-3">
            <div className="border-b border-slate-200 p-5 dark:border-slate-700 sm:border-b-0 sm:border-r">
              <div className="flex items-center gap-3">
                <Users
                  size={20}
                  className="text-blue-600 dark:text-blue-400"
                />

                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Your role
                </span>
              </div>

              <p className="mt-3 text-lg font-semibold capitalize text-slate-900 dark:text-white">
                {workspace.role}
              </p>
            </div>

            <div className="border-b border-slate-200 p-5 dark:border-slate-700 sm:border-b-0 sm:border-r">
              <div className="flex items-center gap-3">
                <CalendarDays
                  size={20}
                  className="text-blue-600 dark:text-blue-400"
                />

                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Created on
                </span>
              </div>

              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                {new Date(workspace.created_at).toLocaleDateString(
                  'en-IN',
                  {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }
                )}
              </p>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-3">
                <FolderKanban
                  size={20}
                  className="text-blue-600 dark:text-blue-400"
                />

                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Projects
                </span>
              </div>

              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                Coming soon
              </p>
            </div>
          </div>
        </section>

        {/* Future dashboard sections */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Get started
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your workspace is ready. You can build out these features next.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 transition-colors dark:border-slate-700 dark:bg-slate-900">
              <FolderKanban
                size={24}
                className="text-blue-600 dark:text-blue-400"
              />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                Projects
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Organize your work into separate projects.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 transition-colors dark:border-slate-700 dark:bg-slate-900">
              <CheckCircle2
                size={24}
                className="text-blue-600 dark:text-blue-400"
              />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                Tickets
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Track tasks, assign work, and monitor progress.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 transition-colors dark:border-slate-700 dark:bg-slate-900">
              <Users
                size={24}
                className="text-blue-600 dark:text-blue-400"
              />

              <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
                Team members
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Prepare your workspace for team collaboration.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default WorkspaceRedirect