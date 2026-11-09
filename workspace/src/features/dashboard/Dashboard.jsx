
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Users,
  Ticket,
  CheckCircle2,
  Clock3,
  CircleDot,
  Plus,
  ArrowRight,
  CalendarDays,
  ListTodo,
  LoaderCircle,
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

function Dashboard() {
  const navigate = useNavigate()

  const [workspace, setWorkspace] = useState(null)
  const [user, setUser] = useState(null)

  const [stats, setStats] = useState({
    projects: 0,
    tickets: 0,
    members: 0,
    completedTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
  })

  const [projects, setProjects] = useState([])
  const [members, setMembers] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        // --------------------------------------------------
        // 1. Get logged-in user
        // --------------------------------------------------
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

        if (active) {
          setUser(user)
        }

        // --------------------------------------------------
        // 2. Find user's workspace
        // --------------------------------------------------
        const {
          data: memberships,
          error: membershipError,
        } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, joined_at')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)

        if (membershipError) throw membershipError

        if (!memberships || memberships.length === 0) {
          if (active) {
            setWorkspace(null)
          }
          return
        }

        const membership = memberships[0]

        // --------------------------------------------------
        // 3. Get workspace
        // --------------------------------------------------
        const {
          data: workspaceData,
          error: workspaceError,
        } = await supabase
          .from('workspaces')
          .select('id, name, description, created_at')
          .eq('id', membership.workspace_id)
          .single()

        if (workspaceError) throw workspaceError

        const currentWorkspace = {
          ...workspaceData,
          role: membership.role,
          joined_at: membership.joined_at,
        }

        if (active) {
          setWorkspace(currentWorkspace)
        }

        const workspaceId = workspaceData.id

        // --------------------------------------------------
        // 4. Load members
        // --------------------------------------------------
        const {
          data: memberData,
          error: memberError,
        } = await supabase
          .from('workspace_members')
          .select('user_id, role, joined_at')
          .eq('workspace_id', workspaceId)
          .order('joined_at', { ascending: true })

        if (memberError) throw memberError

        if (active) {
          setMembers(memberData || [])
        }

        // --------------------------------------------------
        // 5. Load projects
        // --------------------------------------------------
        const {
          data: projectData,
          error: projectError,
        } = await supabase
          .from('projects')
          .select('id, name, description, created_at')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })

        if (projectError) throw projectError

        if (active) {
          setProjects(projectData || [])
        }

        // --------------------------------------------------
        // 6. Load tickets
        // --------------------------------------------------
        const {
          data: ticketData,
          error: ticketError,
        } = await supabase
          .from('tickets')
          .select('id, status, project_id, projects!inner(workspace_id)')
          .eq('projects.workspace_id', workspaceId)

        if (ticketError) throw ticketError

        const tickets = ticketData || []

        // --------------------------------------------------
        // 7. Calculate ticket statistics
        // --------------------------------------------------
        const completedTickets = tickets.filter((ticket) => {
          const status = String(ticket.status || '').toLowerCase()

          return (
            status === 'done' ||
            status === 'completed' ||
            status === 'closed'
          )
        }).length

        const inProgressTickets = tickets.filter((ticket) => {
          const status = String(ticket.status || '').toLowerCase()

          return (
            status === 'in progress' ||
            status === 'in_progress' ||
            status === 'inprogress'
          )
        }).length

        const openTickets = tickets.filter((ticket) => {
          const status = String(ticket.status || '').toLowerCase()

          return (
            status === 'open' ||
            status === 'todo' ||
            status === 'to do' ||
            status === 'pending'
          )
        }).length

        if (active) {
          setStats({
            projects: projectData?.length || 0,
            tickets: tickets.length,
            members: memberData?.length || 0,
            completedTickets,
            openTickets,
            inProgressTickets,
          })
        }
      } catch (err) {
        console.error('Dashboard loading error:', err)

        if (active) {
          setError(
            err.message || 'Unable to load your dashboard.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 transition-colors dark:bg-slate-950">
        <div className="text-center">
          <LoaderCircle
            size={36}
            className="mx-auto animate-spin text-blue-600 dark:text-blue-400"
          />

          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // Error
  // --------------------------------------------------
  if (error) {
    return (
      <div className="min-h-full bg-slate-50 p-6 transition-colors dark:bg-slate-950">
        <div
          role="alert"
          className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          <h2 className="font-semibold">
            Unable to load your dashboard
          </h2>

          <p className="mt-2 text-sm">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // --------------------------------------------------
  // No workspace
  // --------------------------------------------------
  if (!workspace) {
    return <Navigate to="/workspaces/new" replace />
  }

  const totalTickets =
    stats.openTickets +
    stats.inProgressTickets +
    stats.completedTickets

  const completionPercentage =
    totalTickets > 0
      ? Math.round(
          (stats.completedTickets / totalTickets) * 100
        )
      : 0

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------
  return (
    <div className="min-h-full bg-slate-50 p-4 transition-colors dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ==================================================
            HEADER
        ================================================== */}
        <section>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Workspace / Overview
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Welcome back! Here's an overview of your workspace.
          </p>
        </section>

        {/* ==================================================
            STAT CARDS
        ================================================== */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Projects */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <FolderKanban size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Total
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
              {stats.projects}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Projects
            </p>
          </div>

          {/* Tickets */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Ticket size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Total
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
              {stats.tickets}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tickets
            </p>
          </div>

          {/* Members */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Users size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Team
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
              {stats.members}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Members
            </p>
          </div>

          {/* Completed */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                <CheckCircle2 size={22} />
              </div>

              <span className="text-xs font-medium text-slate-400">
                Done
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
              {stats.completedTickets}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Completed tickets
            </p>
          </div>
        </section>

        {/* ==================================================
            TICKET OVERVIEW + WORKSPACE
        ================================================== */}
        <section className="grid gap-6 lg:grid-cols-2">

          {/* Ticket Overview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Ticket Overview
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Current ticket status across your workspace.
                </p>
              </div>

              <ListTodo
                size={22}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>

            <div className="mt-6 space-y-5">

              {/* Open */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot
                      size={16}
                      className="text-blue-500"
                    />

                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Open
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {stats.openTickets}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width:
                        totalTickets > 0
                          ? `${(stats.openTickets / totalTickets) * 100}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>

              {/* In Progress */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock3
                      size={16}
                      className="text-amber-500"
                    />

                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      In Progress
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {stats.inProgressTickets}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{
                      width:
                        totalTickets > 0
                          ? `${(stats.inProgressTickets / totalTickets) * 100}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Completed */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className="text-green-500"
                    />

                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Completed
                    </span>
                  </div>

                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {stats.completedTickets}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{
                      width:
                        totalTickets > 0
                          ? `${(stats.completedTickets / totalTickets) * 100}%`
                          : '0%',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Completion rate
                </span>

                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {completionPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Workspace */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your workspace
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {workspace.name}
                </h2>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <FolderKanban size={22} />
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {workspace.description ||
                'No workspace description has been added yet.'}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <Users
                    size={17}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Your role
                  </span>
                </div>

                <p className="mt-2 font-semibold capitalize text-slate-900 dark:text-white">
                  {workspace.role}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <CalendarDays
                    size={17}
                    className="text-blue-600 dark:text-blue-400"
                  />

                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Created
                  </span>
                </div>

                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                  {new Date(
                    workspace.created_at
                  ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            PROJECTS
        ================================================== */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">

          <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Projects
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Your workspace projects.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              View all
              <ArrowRight size={16} />
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 text-center">
              <FolderKanban
                size={32}
                className="mx-auto text-slate-300 dark:text-slate-600"
              />

              <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
                No projects yet
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create your first project to start organizing your work.
              </p>

              {workspace.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Plus size={16} />
                  Create project
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {projects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <FolderKanban size={19} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-slate-900 dark:text-white">
                        {project.name}
                      </h3>

                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {project.description ||
                          'No project description'}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ==================================================
            QUICK ACTIONS + TEAM
        ================================================== */}
        <section className="grid gap-6 lg:grid-cols-2">

          {/* Quick Actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Quick Actions
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Quickly access common workspace actions.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              {workspace.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Plus size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Create Project
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add a new project
                    </p>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate('/tickets')}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:hover:border-violet-800 dark:hover:bg-violet-950/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <Plus size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Create Ticket
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add a new ticket
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/teams')}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Users size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Manage Team
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    View team members
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/kanban')}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50 dark:border-slate-700 dark:hover:border-amber-800 dark:hover:bg-amber-950/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <ListTodo size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Open Kanban
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    View ticket board
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Team */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Team
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Workspace members.
                </p>
              </div>

              <Users
                size={22}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>

            {members.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No team members found.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {members.slice(0, 4).map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {member.user_id
                          ?.slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {member.user_id === user?.id
                            ? 'You'
                            : 'Workspace member'}
                        </p>

                        <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {members.length > 4 && (
              <div className="border-t border-slate-200 p-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => navigate('/teams')}
                  className="flex w-full items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View all members
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
