import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Ticket,
  Columns3,
  Users,
  Activity,
  Bell,
  MessageSquare,
  Settings,
  Building2,
  ChevronDown,
  Plus,
  Check,
  LoaderCircle,
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

// All navigation links displayed in the sidebar.
const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Tickets', path: '/tickets', icon: Ticket },
  { name: 'Kanban Board', path: '/kanban', icon: Columns3 },
  { name: 'Comments', path: '/comments', icon: MessageSquare },
  { name: 'Teams', path: '/teams', icon: Users },
  { name: 'Activity', path: '/activity', icon: Activity },
  { name: 'Notifications', path: '/notifications', icon: Bell },
]

function Sidebar() {
  const navigate = useNavigate()
  const sidebarRef = useRef(null)

  // Controls the expanded or collapsed sidebar.
  const [expanded, setExpanded] = useState(false)

  // Controls the workspace dropdown.
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)

  // Stores every workspace the logged-in user belongs to.
  const [workspaces, setWorkspaces] = useState([])

  // Stores the currently selected workspace.
  const [currentWorkspace, setCurrentWorkspace] = useState(null)

  // Indicates whether workspace data is loading.
  const [loadingWorkspace, setLoadingWorkspace] = useState(true)

  // Load all workspaces belonging to the current user.
  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspace(true)

    try {
      // Get the currently logged-in user.
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      const user = userData?.user

      if (!user) {
        setWorkspaces([])
        setCurrentWorkspace(null)
        return
      }

      // Get all workspace memberships for this user.
      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, joined_at')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (membershipError) throw membershipError

      // Handle users who do not belong to any workspace.
      if (!memberships || memberships.length === 0) {
        setWorkspaces([])
        setCurrentWorkspace(null)
        return
      }

      // Collect the IDs of the user's workspaces.
      const workspaceIds = memberships.map(
        (membership) => membership.workspace_id
      )

      // Fetch the workspace details from Supabase.
      const {
        data: workspaceData,
        error: workspaceError,
      } = await supabase
        .from('workspaces')
        .select('id, name, description')
        .in('id', workspaceIds)

      if (workspaceError) throw workspaceError

      // Attach the user's role to each workspace.
      const membershipByWorkspace = new Map(
        memberships.map((membership) => [
          membership.workspace_id,
          membership,
        ])
      )

      const availableWorkspaces = (workspaceData || []).map(
        (workspace) => ({
          ...workspace,
          role: membershipByWorkspace.get(workspace.id)?.role,
        })
      )

      // Read the workspace selected by the user previously.
      const savedWorkspaceId = localStorage.getItem(
        'selectedWorkspaceId'
      )

      // Prefer the saved workspace if the user still belongs to it.
      const selectedWorkspace =
        availableWorkspaces.find(
          (workspace) => workspace.id === savedWorkspaceId
        ) || availableWorkspaces[0] || null

      // Update the workspace list and selected workspace.
      setWorkspaces(availableWorkspaces)
      setCurrentWorkspace(selectedWorkspace)

      // Keep the selected workspace ID available across page loads.
      if (selectedWorkspace) {
        localStorage.setItem(
          'selectedWorkspaceId',
          selectedWorkspace.id
        )
      } else {
        localStorage.removeItem('selectedWorkspaceId')
      }
    } catch (error) {
      console.error('Unable to load workspaces:', error)
    } finally {
      setLoadingWorkspace(false)
    }
  }, [])

  // Load workspaces when the sidebar mounts.
  // Reload them whenever another part of the app creates a workspace.
  useEffect(() => {
    loadWorkspaces()

    // Listen for workspace creation or workspace-list changes.
    window.addEventListener('workspacesUpdated', loadWorkspaces)

    return () => {
      window.removeEventListener(
        'workspacesUpdated',
        loadWorkspaces
      )
    }
  }, [loadWorkspaces])

  // Close the sidebar and workspace menu when clicking outside.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setExpanded(false)
        setWorkspaceMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsideClick
      )
    }
  }, [])

  // Close the workspace dropdown whenever the sidebar collapses.
  useEffect(() => {
    if (!expanded) {
      setWorkspaceMenuOpen(false)
    }
  }, [expanded])

  // Select a workspace and save the selection.
  function handleWorkspaceSelect(workspace) {
    setCurrentWorkspace(workspace)

    localStorage.setItem('selectedWorkspaceId', workspace.id)

    setWorkspaceMenuOpen(false)

    // Return to the dashboard after switching workspaces.
    navigate('/dashboard')
  }

  // Open the existing workspace creation page.
  function handleCreateWorkspace() {
    setWorkspaceMenuOpen(false)
    navigate('/workspaces/new')
  }

  // The actual workspace-joining feature will be implemented separately.
  function handleJoinWorkspace() {
    setWorkspaceMenuOpen(false)
    navigate('/workspaces/new')
  }

  return (
    <div
      className="relative z-40 h-full w-20 shrink-0"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <aside
        ref={sidebarRef}
        className={`absolute inset-y-0 left-0 flex flex-col overflow-visible border-r border-slate-200 bg-white shadow-sm transition-[width,background-color,border-color] duration-200 dark:border-slate-700 dark:bg-slate-900 ${
          expanded ? 'w-64 shadow-xl' : 'w-20'
        }`}
      >
        {/* Application logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-slate-200 px-5 dark:border-slate-700">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
            W
          </div>

          <span
            className={`whitespace-nowrap text-xl font-bold text-slate-800 transition-opacity dark:text-white ${
              expanded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Workspace
          </span>
        </div>

        {/* Workspace selector */}
        <div className="relative shrink-0 border-b border-slate-200 p-3 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setExpanded(true)
              setWorkspaceMenuOpen((open) => !open)
            }}
            aria-expanded={workspaceMenuOpen}
            aria-label="Choose workspace"
            title={currentWorkspace?.name || 'Choose workspace'}
            className={`flex h-11 w-full items-center overflow-hidden rounded-lg bg-slate-100 text-left hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 ${
              expanded
                ? 'gap-3 px-3'
                : 'justify-center px-0'
            }`}
          >
            <Building2
              size={20}
              className="shrink-0 text-blue-600 dark:text-blue-400"
            />

            <div
              className={`min-w-0 flex-1 transition-opacity ${
                expanded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current workspace
              </p>

              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                {loadingWorkspace
                  ? 'Loading...'
                  : currentWorkspace?.name || 'No workspace'}
              </p>
            </div>

            {loadingWorkspace && expanded ? (
              <LoaderCircle
                size={16}
                className="shrink-0 animate-spin text-slate-500"
              />
            ) : (
              <ChevronDown
                size={16}
                className={`shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
                  workspaceMenuOpen ? 'rotate-180' : ''
                } ${expanded ? 'opacity-100' : 'hidden'}`}
              />
            )}
          </button>

          {/* Dropdown showing the user's workspaces and actions. */}
          {workspaceMenuOpen && expanded && (
            <div className="absolute left-3 right-3 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Your workspaces
              </p>

              {/* List all workspaces available to this user. */}
              <div className="max-h-52 overflow-y-auto">
                {workspaces.map((workspace) => {
                  const isSelected =
                    currentWorkspace?.id === workspace.id

                  return (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() =>
                        handleWorkspaceSelect(workspace)
                      }
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Building2
                        size={16}
                        className="shrink-0 text-blue-500"
                      />

                      <span className="min-w-0 flex-1 truncate">
                        {workspace.name}
                      </span>

                      {isSelected && (
                        <Check
                          size={16}
                          className="shrink-0 text-blue-600"
                        />
                      )}
                    </button>
                  )
                })}

                {!loadingWorkspace &&
                  workspaces.length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-500">
                      No workspaces found.
                    </p>
                  )}
              </div>

              {/* Workspace creation and joining actions. */}
              <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCreateWorkspace}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800"
                >
                  <Plus size={17} />
                  Create Workspace
                </button>

                <button
                  type="button"
                  onClick={handleJoinWorkspace}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Users size={17} />
                  Join Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main navigation */}
        <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto p-3">
          <p
            className={`mb-3 whitespace-nowrap px-3 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400 ${
              expanded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Navigation
          </p>

          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={!expanded ? item.name : undefined}
                aria-label={item.name}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-3 overflow-hidden rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                <Icon size={20} className="shrink-0" />

                <span
                  className={`whitespace-nowrap ${
                    expanded ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {item.name}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Settings */}
        <div className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-700">
          <button
            type="button"
            title={!expanded ? 'Settings' : undefined}
            aria-label="Settings"
            className="flex h-11 w-full items-center gap-3 overflow-hidden rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Settings size={20} className="shrink-0" />

            <span
              className={`whitespace-nowrap ${
                expanded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>
    </div>
  )
}

export default Sidebar