import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  X,
  LoaderCircle,
  AlertCircle,
  RefreshCw,
  UserRound,
  ChevronDown,
  SlidersHorizontal,
  Search,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const PRIORITIES = ['High', 'Medium', 'Low']

const STATUSES = [
  'To Do',
  'In Progress',
  'In Review',
  'Completed',
  'Cancelled',
]

const TASK_TYPES = ['Frontend', 'Backend']

function Tickets() {
  const [workspace, setWorkspace] = useState(null)
  const [projects, setProjects] = useState([])
  const [members, setMembers] = useState([])
  const [tickets, setTickets] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [updatingTicket, setUpdatingTicket] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  const [editingTicket, setEditingTicket] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [expandedDescriptionId, setExpandedDescriptionId] =
    useState(null)

  const projectDropdownRef = useRef(null)
  const filtersRef = useRef(null)
  const descriptionContainerRef = useRef(null)

  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [showAssignees, setShowAssignees] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    task_type: 'Frontend',
    assigned_to: '',
    due_date: '',
  })

  const [projectForm, setProjectForm] = useState({
    name: '',
    project_key: '',
    description: '',
  })

  const [filters, setFilters] = useState({
    assigned_to: 'all',
    priority: 'all',
    status: 'all',
    task_type: 'all',
    sort_by: 'default',
  })

  const [filterAssigneeSearch, setFilterAssigneeSearch] =
    useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [projectError, setProjectError] = useState('')

  function formatDate(value) {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  async function loadTickets(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) throw userError

      const user = userData.user

      if (!user) {
        throw new Error('Please log in to view tickets.')
      }

      setCurrentUser(user)

      const { data: memberships, error: membershipError } =
        await supabase
          .from('workspace_members')
          .select('workspace_id, role')
          .eq('user_id', user.id)

      if (membershipError) throw membershipError

      if (!memberships || memberships.length === 0) {
        setWorkspace(null)
        setProjects([])
        setMembers([])
        setTickets([])

        throw new Error(
          'You have not joined a workspace yet.'
        )
      }

      let workspaceId = localStorage.getItem(
        'selectedWorkspaceId'
      )

      let currentMembership = memberships.find(
        (item) => item.workspace_id === workspaceId
      )

      if (!currentMembership) {
        currentMembership = memberships[0]
        workspaceId = currentMembership.workspace_id

        localStorage.setItem(
          'selectedWorkspaceId',
          workspaceId
        )
      }

      const { data: workspaceData, error: workspaceError } =
        await supabase
          .from('workspaces')
          .select('id, name')
          .eq('id', workspaceId)
          .single()

      if (workspaceError) throw workspaceError

      setWorkspace(workspaceData)

      setIsAdmin(
        ['owner', 'admin'].includes(
          currentMembership.role
        )
      )

      const { data: projectData, error: projectError } =
        await supabase
          .from('projects')
          .select(
            'id, name, project_key, description'
          )
          .eq('workspace_id', workspaceId)
          .order('created_at', {
            ascending: true,
          })

      if (projectError) throw projectError

      const loadedProjects = projectData || []

      setProjects(loadedProjects)

      if (loadedProjects.length > 0) {
        setSelectedProject((previous) => {
          if (
            previous &&
            loadedProjects.some(
              (project) =>
                project.id === previous.id
            )
          ) {
            return previous
          }

          return loadedProjects[0]
        })
      } else {
        setSelectedProject(null)
      }

      const {
        data: membershipData,
        error: membersError,
      } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', workspaceId)

      if (membersError) throw membersError

      const userIds = (membershipData || []).map(
        (item) => item.user_id
      )

      let profileMap = new Map()

      if (userIds.length > 0) {
        const {
          data: profiles,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)

        if (profilesError) throw profilesError

        profileMap = new Map(
          (profiles || []).map((profile) => [
            profile.id,
            profile,
          ])
        )
      }

      const memberList = (
        membershipData || []
      ).map((member) => ({
        ...member,
        full_name:
          profileMap.get(member.user_id)
            ?.full_name || 'Unnamed member',
      }))

      setMembers(memberList)

      const projectIds = loadedProjects.map(
        (project) => project.id
      )

      if (projectIds.length === 0) {
        setTickets([])
        return
      }

      const { data: ticketData, error: ticketError } =
        await supabase
          .from('tickets')
          .select('*')
          .in('project_id', projectIds)
          .order('ticket_number', {
            ascending: true,
          })

      if (ticketError) throw ticketError

      setTickets(ticketData || [])
    } catch (err) {
      setError(
        err.message || 'Could not load tickets.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTickets()

    function handleWorkspaceChange() {
      loadTickets()
    }

    window.addEventListener(
      'workspacesUpdated',
      handleWorkspaceChange
    )

    return () => {
      window.removeEventListener(
        'workspacesUpdated',
        handleWorkspaceChange
      )
    }
  }, [])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(
          event.target
        )
      ) {
        setProjectDropdownOpen(false)
      }

      if (
        filtersRef.current &&
        !filtersRef.current.contains(event.target)
      ) {
        setFiltersOpen(false)
      }

      if (
        descriptionContainerRef.current &&
        !descriptionContainerRef.current.contains(
          event.target
        )
      ) {
        setExpandedDescriptionId(null)
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  useEffect(() => {
    setExpandedDescriptionId(null)
  }, [selectedProject?.id])

  function getMemberName(userId) {
    if (!userId) return 'Unassigned'

    return (
      members.find(
        (member) => member.user_id === userId
      )?.full_name || 'Unknown member'
    )
  }

  function getTaskType(ticket) {
    const type =
      ticket.task_type ||
      ticket.type ||
      ticket.taskType ||
      'Frontend'

    return type.toLowerCase() === 'backend'
      ? 'Backend'
      : 'Frontend'
  }

  function taskTypeStyle(type) {
    if (type === 'Backend') {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    }

    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
  }

  function openAddModal(project) {
    if (!isAdmin) return

    setEditingTicket(null)
    setSelectedProject(project)

    setForm({
      title: '',
      description: '',
      priority: 'Medium',
      task_type: 'Frontend',
      assigned_to: '',
      due_date: '',
    })

    setAssigneeSearch('')
    setError('')
    setMessage('')
    setShowAssignees(false)
    setModalOpen(true)
  }

  function openEditModal(ticket, project) {
    if (!isAdmin) return

    setEditingTicket(ticket)
    setSelectedProject(project)

    setForm({
      title: ticket.title || '',
      description: ticket.description || '',
      priority: ticket.priority || 'Medium',
      task_type: getTaskType(ticket),
      assigned_to: ticket.assigned_to || '',
      due_date: ticket.due_date || '',
    })

    setAssigneeSearch(
      getMemberName(ticket.assigned_to)
    )

    setError('')
    setMessage('')
    setShowAssignees(false)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingTicket(null)
    setSelectedProject(null)
    setShowAssignees(false)
  }

  /*
   * OPEN ADD PROJECT MODAL
   */
  function openProjectModal() {
    if (!isAdmin) return

    setProjectDropdownOpen(false)

    setProjectForm({
      name: '',
      project_key: '',
      description: '',
    })

    setProjectError('')
    setMessage('')
    setError('')
    setProjectModalOpen(true)
  }

  /*
   * CLOSE ADD PROJECT MODAL
   */
  function closeProjectModal() {
    if (creatingProject) return

    setProjectModalOpen(false)

    setProjectForm({
      name: '',
      project_key: '',
      description: '',
    })

    setProjectError('')
  }

  /*
   * CREATE PROJECT
   *
   * Uses the same permission and validation
   * logic as the old Projects page.
   */
  async function handleCreateProject(event) {
    event.preventDefault()

    setProjectError('')
    setError('')
    setMessage('')

    if (!isAdmin) {
      setProjectError(
        'Only the workspace owner can create projects.'
      )
      return
    }

    const cleanName =
      projectForm.name.trim()

    const cleanKey =
      projectForm.project_key
        .trim()
        .toUpperCase()

    const cleanDescription =
      projectForm.description.trim()

    if (!cleanName) {
      setProjectError(
        'Please enter a project name.'
      )
      return
    }

    if (
      !/^[A-Z0-9]{2,10}$/.test(cleanKey)
    ) {
      setProjectError(
        'Project key must contain 2–10 uppercase letters or numbers.'
      )
      return
    }

    if (!workspace?.id) {
      setProjectError(
        'Please select a workspace before creating a project.'
      )
      return
    }

    setCreatingProject(true)

    try {
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      const user = userData.user

      if (!user) {
        throw new Error(
          'Please log in before creating a project.'
        )
      }

      const workspaceId = workspace.id

      /*
       * Verify the user's membership and role
       * again before inserting.
       */
      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (membershipError) {
        throw membershipError
      }

      /*
       * Project creation follows the old
       * Projects.jsx behavior:
       * only the workspace OWNER can create.
       */
      if (membership.role === 'owner' || membership?.role !== 'owner') {
        setIsAdmin(false)

        throw new Error(
          'Only the workspace owner can create projects.'
        )
      }

      /*
       * Verify that the selected workspace has
       * not changed while the modal was open.
       */
      const currentWorkspaceId =
        localStorage.getItem(
          'selectedWorkspaceId'
        )

      if (
        currentWorkspaceId &&
        currentWorkspaceId !== workspaceId
      ) {
        throw new Error(
          'Your selected workspace has changed. Please try again.'
        )
      }

      /*
       * Create the project.
       *
       * created_by is included exactly like
       * the old Projects.jsx implementation.
       */
      const {
        data: newProject,
        error: insertError,
      } = await supabase
        .from('projects')
        .insert({
          workspace_id: workspaceId,
          name: cleanName,
          project_key: cleanKey,
          description:
            cleanDescription || null,
          created_by: user.id,
        })
        .select(
          'id, name, project_key, description'
        )
        .single()

      if (insertError) {
        throw insertError
      }

      /*
       * Add the new project immediately to
       * the current project list.
       */
      setProjects((previous) => [
        ...previous,
        newProject,
      ])

      /*
       * Automatically select the newly
       * created project.
       */
      setSelectedProject(newProject)

      /*
       * Close modal.
       */
      setProjectModalOpen(false)

      /*
       * Reset form.
       */
      setProjectForm({
        name: '',
        project_key: '',
        description: '',
      })

      setProjectError('')

      setMessage(
        `Project "${newProject.name}" created successfully!`
      )

      /*
       * Reload everything from Supabase so
       * Tickets.jsx is synchronized with DB.
       */
      await loadTickets(true)
    } catch (err) {
      console.error(
        'Error creating project:',
        err
      )

      if (err.code === '23505') {
        setProjectError(
          'This project key already exists in your workspace. Choose another key.'
        )
      } else if (err.code === '42501') {
        setProjectError(
          'You do not have permission to create a project in this workspace.'
        )
      } else {
        setProjectError(
          err.message ||
            'Could not create the project.'
        )
      }
    } finally {
      setCreatingProject(false)
    }
  }

  async function handleSaveTicket(event) {
    event.preventDefault()

    if (!isAdmin || !selectedProject) return

    if (!form.title.trim()) {
      setError('Please enter a ticket name.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const now = new Date().toISOString()

      if (editingTicket) {
        const assignmentChanged =
          editingTicket.assigned_to !==
          (form.assigned_to || null)

        const updateData = {
          title: form.title.trim(),
          description:
            form.description.trim() || null,
          priority: form.priority,
          task_type:
            form.task_type.toLowerCase(),
          assigned_to:
            form.assigned_to || null,
          assigned_at: form.assigned_to
            ? assignmentChanged
              ? now
              : editingTicket.assigned_at
            : null,
          due_date:
            form.due_date || null,
        }

        const { error: updateError } =
          await supabase
            .from('tickets')
            .update(updateData)
            .eq('id', editingTicket.id)

        if (updateError) throw updateError

        setMessage(
          'Ticket updated successfully.'
        )
      } else {
        const {
          data: ticketNumber,
          error: numberError,
        } = await supabase.rpc(
          'get_next_ticket_number',
          {
            p_project_id: selectedProject.id,
          }
        )

        if (numberError) throw numberError

        const { error: insertError } =
          await supabase
            .from('tickets')
            .insert({
              project_id: selectedProject.id,
              title: form.title.trim(),
              description:
                form.description.trim() ||
                null,
              ticket_number: ticketNumber,
              priority: form.priority,
              task_type:
                form.task_type.toLowerCase(),
              status: 'To Do',
              created_by: currentUser.id,
              assigned_to:
                form.assigned_to || null,
              assigned_at: form.assigned_to
                ? now
                : null,
              due_date:
                form.due_date || null,
            })

        if (insertError) throw insertError

        setMessage(
          'Ticket created successfully.'
        )
      }

      setModalOpen(false)
      setEditingTicket(null)

      await loadTickets(true)
    } catch (err) {
      setError(
        err.message ||
          'Could not save the ticket.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTicket() {
    if (!isAdmin || !editingTicket) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this ticket? This action cannot be undone.'
    )

    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      const { error: deleteError } =
        await supabase
          .from('tickets')
          .delete()
          .eq('id', editingTicket.id)

      if (deleteError) throw deleteError

      setModalOpen(false)
      setEditingTicket(null)
      setMessage(
        'Ticket deleted successfully.'
      )

      await loadTickets(true)
    } catch (err) {
      setError(
        err.message ||
          'Could not delete the ticket.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handlePriorityChange(
    ticket,
    priority
  ) {
    if (!isAdmin) return

    setUpdatingTicket(ticket.id)
    setError('')
    setMessage('')

    try {
      const { error: updateError } =
        await supabase
          .from('tickets')
          .update({ priority })
          .eq('id', ticket.id)

      if (updateError) throw updateError

      setTickets((previous) =>
        previous.map((item) =>
          item.id === ticket.id
            ? { ...item, priority }
            : item
        )
      )
    } catch (err) {
      setError(
        err.message ||
          'Could not update priority.'
      )
    } finally {
      setUpdatingTicket(null)
    }
  }

  async function handleStatusChange(
    ticket,
    status
  ) {
    setUpdatingTicket(ticket.id)
    setError('')
    setMessage('')

    try {
      const completedAt =
        status === 'Completed'
          ? new Date().toISOString()
          : null

      const { error: updateError } =
        await supabase
          .from('tickets')
          .update({
            status,
            completed_at: completedAt,
          })
          .eq('id', ticket.id)

      if (updateError) throw updateError

      setTickets((previous) =>
        previous.map((item) =>
          item.id === ticket.id
            ? {
                ...item,
                status,
                completed_at:
                  completedAt,
              }
            : item
        )
      )
    } catch (err) {
      setError(
        err.message ||
          'Could not update ticket status.'
      )
    } finally {
      setUpdatingTicket(null)
    }
  }

  function priorityStyle(priority) {
    if (priority === 'High') {
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
    }

    if (priority === 'Low') {
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
    }

    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
  }

  function statusStyle(status) {
    if (status === 'Completed') {
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
    }

    if (status === 'In Progress') {
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
    }

    if (status === 'In Review') {
      return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300'
    }

    if (status === 'Cancelled') {
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
    }

    return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300'
  }

  const filteredAssignees = members.filter(
    (member) =>
      member.full_name
        .toLowerCase()
        .includes(
          assigneeSearch.toLowerCase()
        )
  )

  const filteredFilterMembers =
    members.filter((member) =>
      member.full_name
        .toLowerCase()
        .includes(
          filterAssigneeSearch.toLowerCase()
        )
    )

  const selectedProjectTickets = useMemo(() => {
    if (!selectedProject) return []

    let result = tickets.filter(
      (ticket) =>
        ticket.project_id ===
        selectedProject.id
    )

    if (filters.assigned_to !== 'all') {
      if (
        filters.assigned_to ===
        'unassigned'
      ) {
        result = result.filter(
          (ticket) => !ticket.assigned_to
        )
      } else {
        result = result.filter(
          (ticket) =>
            ticket.assigned_to ===
            filters.assigned_to
        )
      }
    }

    if (filters.priority !== 'all') {
      result = result.filter(
        (ticket) =>
          ticket.priority ===
          filters.priority
      )
    }

    if (filters.status !== 'all') {
      result = result.filter(
        (ticket) =>
          ticket.status ===
          filters.status
      )
    }

    if (filters.task_type !== 'all') {
      result = result.filter(
        (ticket) =>
          getTaskType(ticket).toLowerCase() ===
          filters.task_type.toLowerCase()
      )
    }

    if (filters.sort_by === 'employee') {
      result.sort((a, b) =>
        getMemberName(
          a.assigned_to
        ).localeCompare(
          getMemberName(b.assigned_to)
        )
      )
    }

    if (filters.sort_by === 'priority') {
      const priorityOrder = {
        High: 1,
        Medium: 2,
        Low: 3,
      }

      result.sort(
        (a, b) =>
          priorityOrder[a.priority] -
          priorityOrder[b.priority]
      )
    }

    if (filters.sort_by === 'status') {
      const statusOrder = {
        'To Do': 1,
        'In Progress': 2,
        'In Review': 3,
        Completed: 4,
        Cancelled: 5,
      }

      result.sort(
        (a, b) =>
          statusOrder[a.status] -
          statusOrder[b.status]
      )
    }

    if (filters.sort_by === 'task_type') {
      result.sort((a, b) =>
        getTaskType(a).localeCompare(
          getTaskType(b)
        )
      )
    }

    if (filters.sort_by === 'newest') {
      result.sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      )
    }

    if (filters.sort_by === 'oldest') {
      result.sort(
        (a, b) =>
          new Date(a.created_at) -
          new Date(b.created_at)
      )
    }

    return result
  }, [
    tickets,
    selectedProject,
    filters,
    members,
  ])

  const activeFilterCount =
    Object.values(filters).filter(
      (value) =>
        value !== 'all' &&
        value !== 'default'
    ).length

  function clearFilters() {
    setFilters({
      assigned_to: 'all',
      priority: 'all',
      status: 'all',
      task_type: 'all',
      sort_by: 'default',
    })

    setFilterAssigneeSearch('')
  }

  function toggleDescription(ticketId) {
    setExpandedDescriptionId((current) =>
      current === ticketId
        ? null
        : ticketId
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-slate-600 dark:text-slate-300">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Loading tickets...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <Ticket className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Tickets
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage tickets across{' '}
              {workspace?.name ||
                'your workspace'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadTickets(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />

          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && !modalOpen && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* SUCCESS MESSAGE */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
          {message}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <Ticket className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />

          <h3 className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
            No projects found
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a project first to start
            adding tickets.
          </p>

          {isAdmin && (
            <button
              type="button"
              onClick={openProjectModal}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Project
            </button>
          )}
        </div>
      ) : (
        <>
          {/* PROJECT SELECTOR + FILTERS */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {/* PROJECT DROPDOWN */}
              <div
                ref={projectDropdownRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setProjectDropdownOpen(
                      (current) =>
                        !current
                    )
                  }
                  className="inline-flex min-w-[220px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span className="truncate">
                    {selectedProject?.name ||
                      'Select project'}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      projectDropdownOpen
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                {projectDropdownOpen && (
                  <div className="absolute left-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="max-h-72 overflow-y-auto py-1">
                      {projects.map(
                        (project) => {
                          const selected =
                            project.id ===
                            selectedProject?.id

                          return (
                            <button
                              key={
                                project.id
                              }
                              type="button"
                              onClick={() => {
                                setSelectedProject(
                                  project
                                )
                                setProjectDropdownOpen(
                                  false
                                )
                              }}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <div className="min-w-0">
                                <div
                                  className={`truncate font-medium ${
                                    selected
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {
                                    project.name
                                  }
                                </div>

                                <div className="mt-0.5 text-xs text-slate-400">
                                  {
                                    project.project_key
                                  }
                                </div>
                              </div>

                              {selected && (
                                <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                              )}
                            </button>
                          )
                        }
                      )}

                      {/* ADD PROJECT */}
                      {isAdmin && (
                        <div className="border-t border-slate-200 p-2 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={
                              openProjectModal
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          >
                            <Plus className="h-4 w-4" />
                            Add Project
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* FILTERS */}
              <div
                ref={filtersRef}
                className="relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setFiltersOpen(
                      (current) =>
                        !current
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    filtersOpen ||
                    activeFilterCount >
                      0
                      ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />

                  Filters

                  {activeFilterCount >
                    0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                      {
                        activeFilterCount
                      }
                    </span>
                  )}
                </button>

                {filtersOpen && (
                  <div className="absolute left-0 top-full z-40 mt-2 w-[330px] rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800 dark:text-white">
                        Filters
                      </h3>

                      {activeFilterCount >
                        0 && (
                        <button
                          type="button"
                          onClick={
                            clearFilters
                          }
                          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* ASSIGNED TO */}
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Assigned To
                        </label>

                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                          <input
                            type="text"
                            value={
                              filterAssigneeSearch
                            }
                            onChange={(
                              event
                            ) =>
                              setFilterAssigneeSearch(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Search employee..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() =>
                              setFilters({
                                ...filters,
                                assigned_to:
                                  'all',
                              })
                            }
                            className={`w-full px-3 py-2 text-left text-sm ${
                              filters.assigned_to ===
                              'all'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            All employees
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setFilters({
                                ...filters,
                                assigned_to:
                                  'unassigned',
                              })
                            }
                            className={`w-full px-3 py-2 text-left text-sm ${
                              filters.assigned_to ===
                              'unassigned'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            Unassigned
                          </button>

                          {filteredFilterMembers.map(
                            (
                              member
                            ) => (
                              <button
                                key={
                                  member.user_id
                                }
                                type="button"
                                onClick={() =>
                                  setFilters(
                                    {
                                      ...filters,
                                      assigned_to:
                                        member.user_id,
                                    }
                                  )
                                }
                                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                                  filters.assigned_to ===
                                  member.user_id
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {member.full_name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </span>

                                <span className="truncate">
                                  {
                                    member.full_name
                                  }
                                </span>
                              </button>
                            )
                          )}

                          {filteredFilterMembers.length ===
                            0 &&
                            filterAssigneeSearch && (
                              <p className="px-3 py-2 text-xs text-slate-500">
                                No employee found.
                              </p>
                            )}
                        </div>
                      </div>

                      {/* PRIORITY */}
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Priority
                        </label>

                        <select
                          value={
                            filters.priority
                          }
                          onChange={(
                            event
                          ) =>
                            setFilters({
                              ...filters,
                              priority:
                                event
                                  .target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="all">
                            All priorities
                          </option>

                          {PRIORITIES.map(
                            (
                              priority
                            ) => (
                              <option
                                key={
                                  priority
                                }
                                value={
                                  priority
                                }
                              >
                                {
                                  priority
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* STATUS */}
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Status
                        </label>

                        <select
                          value={
                            filters.status
                          }
                          onChange={(
                            event
                          ) =>
                            setFilters({
                              ...filters,
                              status:
                                event
                                  .target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="all">
                            All statuses
                          </option>

                          {STATUSES.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* TASK TYPE */}
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Task Type
                        </label>

                        <select
                          value={
                            filters.task_type
                          }
                          onChange={(
                            event
                          ) =>
                            setFilters({
                              ...filters,
                              task_type:
                                event
                                  .target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="all">
                            All task types
                          </option>

                          <option value="frontend">
                            Frontend
                          </option>

                          <option value="backend">
                            Backend
                          </option>
                        </select>
                      </div>

                      {/* SORT */}
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Sort By
                        </label>

                        <select
                          value={
                            filters.sort_by
                          }
                          onChange={(
                            event
                          ) =>
                            setFilters({
                              ...filters,
                              sort_by:
                                event
                                  .target
                                  .value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="default">
                            Default order
                          </option>

                          <option value="employee">
                            Employee
                          </option>

                          <option value="priority">
                            Priority
                          </option>

                          <option value="status">
                            Status
                          </option>

                          <option value="task_type">
                            Task Type
                          </option>

                          <option value="newest">
                            Newest first
                          </option>

                          <option value="oldest">
                            Oldest first
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {isAdmin &&
              selectedProject && (
                <button
                  type="button"
                  onClick={() =>
                    openAddModal(
                      selectedProject
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Ticket
                </button>
              )}
          </div>

          {/* SELECTED PROJECT */}
          {selectedProject && (
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                      {
                        selectedProject.name
                      }
                    </h2>

                    <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {
                        selectedProject.project_key
                      }
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {
                      selectedProjectTickets.length
                    }{' '}
                    {selectedProjectTickets.length ===
                    1
                      ? 'ticket'
                      : 'tickets'}
                  </p>
                </div>
              </div>

              {selectedProjectTickets.length ===
              0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  No tickets match the
                  selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1450px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-3">
                          Sr. No.
                        </th>

                        <th className="px-4 py-3">
                          Ticket Name
                        </th>

                        <th className="px-4 py-3">
                          Task Details
                        </th>

                        <th className="px-4 py-3">
                          Priority
                        </th>

                        <th className="px-4 py-3">
                          Assign To
                        </th>

                        <th className="px-4 py-3">
                          Assigned Date
                        </th>

                        <th className="px-4 py-3">
                          Due Date
                        </th>

                        <th className="px-4 py-3">
                          Completion Date
                        </th>

                        <th className="px-4 py-3">
                          Status
                        </th>

                        <th className="px-4 py-3">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedProjectTickets.map(
                        (
                          ticket,
                          index
                        ) => {
                          const taskType =
                            getTaskType(
                              ticket
                            )

                          const isDescriptionExpanded =
                            expandedDescriptionId ===
                            ticket.id

                          return (
                            <tr
                              key={
                                ticket.id
                              }
                              className={`transition ${
                                isDescriptionExpanded
                                  ? 'bg-slate-50 dark:bg-slate-800/40'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                              }`}
                            >
                              {/* SR NO */}
                              <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                                {index +
                                  1}
                              </td>

                              {/* TICKET NAME */}
                              <td className="max-w-[220px] px-4 py-4">
                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {
                                    ticket.title
                                  }
                                </div>

                                <div className="mt-1.5">
                                  <span
                                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${taskTypeStyle(
                                      taskType
                                    )}`}
                                  >
                                    {
                                      taskType
                                    }
                                  </span>
                                </div>
                              </td>

                              {/* TASK DETAILS */}
                              <td
                                ref={
                                  isDescriptionExpanded
                                    ? descriptionContainerRef
                                    : null
                                }
                                onClick={() =>
                                  toggleDescription(
                                    ticket.id
                                  )
                                }
                                className={`max-w-[300px] cursor-pointer px-4 py-4 text-slate-600 dark:text-slate-300 ${
                                  isDescriptionExpanded
                                    ? 'whitespace-pre-wrap'
                                    : ''
                                }`}
                                title={
                                  isDescriptionExpanded
                                    ? ''
                                    : 'Click to expand'
                                }
                              >
                                <p
                                  className={
                                    isDescriptionExpanded
                                      ? 'break-words'
                                      : 'line-clamp-2 break-words'
                                  }
                                >
                                  {ticket.description ||
                                    '—'}
                                </p>
                              </td>

                              {/* PRIORITY */}
                              <td className="px-4 py-4">
                                <div className="relative inline-flex items-center">
                                  <select
                                    value={
                                      ticket.priority
                                    }
                                    disabled={
                                      !isAdmin ||
                                      updatingTicket ===
                                        ticket.id
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      handlePriorityChange(
                                        ticket,
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    className={`appearance-none rounded-full border py-1.5 pl-3 pr-7 text-xs font-semibold outline-none ${priorityStyle(
                                      ticket.priority
                                    )} disabled:cursor-not-allowed disabled:opacity-90`}
                                  >
                                    {PRIORITIES.map(
                                      (
                                        priority
                                      ) => (
                                        <option
                                          key={
                                            priority
                                          }
                                          value={
                                            priority
                                          }
                                        >
                                          {
                                            priority
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>

                                  {isAdmin && (
                                    <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3" />
                                  )}
                                </div>
                              </td>

                              {/* ASSIGNED TO */}
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {getMemberName(
                                      ticket.assigned_to
                                    )
                                      .charAt(
                                        0
                                      )
                                      .toUpperCase()}
                                  </div>

                                  <span>
                                    {getMemberName(
                                      ticket.assigned_to
                                    )}
                                  </span>
                                </div>
                              </td>

                              {/* ASSIGNED DATE */}
                              <td className="whitespace-nowrap px-4 py-4 text-slate-500 dark:text-slate-400">
                                {formatDate(
                                  ticket.assigned_at
                                )}
                              </td>

                              {/* DUE DATE */}
                              <td className="whitespace-nowrap px-4 py-4 text-slate-500 dark:text-slate-400">
                                {formatDate(
                                  ticket.due_date
                                )}
                              </td>

                              {/* COMPLETION DATE */}
                              <td className="whitespace-nowrap px-4 py-4 text-slate-500 dark:text-slate-400">
                                {formatDate(
                                  ticket.completed_at
                                )}
                              </td>

                              {/* STATUS */}
                              <td className="px-4 py-4">
                                <div className="relative inline-flex items-center">
                                  <select
                                    value={
                                      ticket.status
                                    }
                                    disabled={
                                      updatingTicket ===
                                      ticket.id
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      handleStatusChange(
                                        ticket,
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    className={`appearance-none rounded-full border py-1.5 pl-3 pr-7 text-xs font-semibold outline-none disabled:opacity-60 ${statusStyle(
                                      ticket.status
                                    )}`}
                                  >
                                    {STATUSES.map(
                                      (
                                        status
                                      ) => (
                                        <option
                                          key={
                                            status
                                          }
                                          value={
                                            status
                                          }
                                        >
                                          {
                                            status
                                          }
                                        </option>
                                      )
                                    )}
                                  </select>

                                  <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3" />
                                </div>
                              </td>

                              {/* ACTION */}
                              <td className="px-4 py-4">
                                {isAdmin ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(
                                        ticket,
                                        selectedProject
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ADD / EDIT TICKET MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl overflow-visible rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                  {editingTicket
                    ? 'Edit Ticket'
                    : 'Add Ticket'}
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Project:{' '}
                  {selectedProject?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveTicket}
              className="space-y-5 p-6"
            >
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* TICKET NAME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Ticket Name *
                </label>

                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  placeholder="Enter ticket name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
                />
              </div>

              {/* TASK DETAILS */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Task Details
                </label>

                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="Describe the task..."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
                />
              </div>

              {/* TASK TYPE + PRIORITY */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Task Type
                  </label>

                  <select
                    value={form.task_type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        task_type:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {TASK_TYPES.map(
                      (type) => (
                        <option
                          key={type}
                          value={type}
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Priority
                  </label>

                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        priority:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {PRIORITIES.map(
                      (priority) => (
                        <option
                          key={priority}
                          value={priority}
                        >
                          {priority}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* DUE DATE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Due Date
                </label>

                <input
                  type="date"
                  value={form.due_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      due_date:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* ASSIGN TO */}
              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Assign To
                </label>

                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={
                      assigneeSearch
                    }
                    onFocus={() =>
                      setShowAssignees(
                        true
                      )
                    }
                    onChange={(event) => {
                      setAssigneeSearch(
                        event.target
                          .value
                      )

                      setShowAssignees(
                        true
                      )

                      setForm({
                        ...form,
                        assigned_to:
                          '',
                      })
                    }}
                    placeholder="Search workspace members..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {showAssignees && (
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          ...form,
                          assigned_to:
                            '',
                        })

                        setAssigneeSearch(
                          ''
                        )
                        setShowAssignees(
                          false
                        )
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Unassigned
                    </button>

                    {filteredAssignees.map(
                      (member) => (
                        <button
                          type="button"
                          key={
                            member.user_id
                          }
                          onClick={() => {
                            setForm({
                              ...form,
                              assigned_to:
                                member.user_id,
                            })

                            setAssigneeSearch(
                              member.full_name
                            )

                            setShowAssignees(
                              false
                            )
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            {member.full_name
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </span>

                          <span>
                            {
                              member.full_name
                            }
                          </span>
                        </button>
                      )
                    )}

                    {filteredAssignees.length ===
                      0 && (
                      <p className="px-4 py-3 text-sm text-slate-500">
                        No matching members
                        found.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assigned Date is recorded
                automatically when a member is
                selected. Completion Date is
                recorded when the status becomes
                Completed.
              </p>

              {/* FOOTER */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {editingTicket && (
                    <button
                      type="button"
                      onClick={
                        handleDeleteTicket
                      }
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Ticket
                    </button>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={saving}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}

                    {editingTicket
                      ? 'Save Changes'
                      : 'Create Ticket'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PROJECT MODAL */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* PROJECT MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                  Add Project
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Create a new project in{' '}
                  {workspace?.name ||
                    'your workspace'}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeProjectModal
                }
                disabled={creatingProject}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PROJECT FORM */}
            <form
              onSubmit={
                handleCreateProject
              }
              className="space-y-5 p-6"
            >
              {projectError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>
                    {projectError}
                  </span>
                </div>
              )}

              {/* PROJECT NAME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Project Name *
                </label>

                <input
                  type="text"
                  required
                  value={
                    projectForm.name
                  }
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      name: event.target
                        .value,
                    })
                  }
                  placeholder="Enter project name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
                />
              </div>

              {/* PROJECT KEY */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Project Key *
                </label>

                <input
                  type="text"
                  required
                  maxLength={10}
                  value={
                    projectForm.project_key
                  }
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      project_key:
                        event.target.value
                          .toUpperCase()
                          .replace(
                            /[^A-Z0-9]/g,
                            ''
                          )
                          .slice(0, 10),
                    })
                  }
                  placeholder="Example: WEB"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
                />

                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  A short identifier for the
                  project, such as WEB, CRM, or
                  TASK.
                </p>
              </div>

              {/* PROJECT DESCRIPTION */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={
                    projectForm.description
                  }
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      description:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Describe the project..."
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
                />
              </div>

              {/* FOOTER */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
                <button
                  type="button"
                  onClick={
                    closeProjectModal
                  }
                  disabled={
                    creatingProject
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creatingProject
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingProject && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}

                  {creatingProject
                    ? 'Creating...'
                    : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tickets