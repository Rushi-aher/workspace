import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Plus,
  X,
  LoaderCircle,
  ArrowUpRight,
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

function Projects() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [workspaceId, setWorkspaceId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [projectKey, setProjectKey] = useState('')
  const [description, setDescription] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Load projects belonging to the workspace selected in the sidebar.
  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Get the logged-in user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        throw new Error('Please log in to view projects.')
      }

      // Read the workspace selected in the sidebar.
      let selectedWorkspaceId = localStorage.getItem(
        'selectedWorkspaceId'
      )

      // If no workspace is selected, use the user's first membership.
      if (!selectedWorkspaceId) {
        const {
          data: memberships,
          error: membershipError,
        } = await supabase
          .from('workspace_members')
          .select('workspace_id, joined_at')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: true })
          .limit(1)

        if (membershipError) throw membershipError

        if (!memberships || memberships.length === 0) {
          setWorkspaceId(null)
          setProjects([])
          return
        }

        selectedWorkspaceId = memberships[0].workspace_id

        // Save the default selection for future visits.
        localStorage.setItem(
          'selectedWorkspaceId',
          selectedWorkspaceId
        )
      }

      // Verify that the current user belongs to the selected workspace.
      const {
        data: membership,
        error: selectedMembershipError,
      } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('workspace_id', selectedWorkspaceId)
        .maybeSingle()

      if (selectedMembershipError) {
        throw selectedMembershipError
      }

      // If the saved selection is invalid, clear it and ask the user to select again.
      if (!membership) {
        localStorage.removeItem('selectedWorkspaceId')
        setWorkspaceId(null)
        setProjects([])
        setError(
          'The selected workspace could not be found. Please select a workspace from the sidebar.'
        )
        return
      }

      // Save the verified workspace ID in component state.
      setWorkspaceId(selectedWorkspaceId)

      // Fetch projects only from the selected workspace.
      const {
        data,
        error: projectsError,
      } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', selectedWorkspaceId)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      setProjects(data || [])
    } catch (err) {
      console.error('Error loading projects:', err)
      setError(err.message || 'Could not load projects.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load projects on page entry and whenever the sidebar changes workspaces.
  useEffect(() => {
    loadProjects()

    // The sidebar dispatches this event when a workspace is selected or created.
    window.addEventListener('workspacesUpdated', loadProjects)

    return () => {
      window.removeEventListener('workspacesUpdated', loadProjects)
    }
  }, [loadProjects])

  // Generate a suggested project key from the project name.
  function handleNameChange(value) {
    setName(value)

    const generatedKey = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .slice(0, 10)

    setProjectKey(generatedKey)
  }

  // Create a project inside the currently selected workspace.
  async function handleCreateProject(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    const cleanName = name.trim()
    const cleanKey = projectKey.trim().toUpperCase()
    const cleanDescription = description.trim()

    if (!cleanName) {
      setError('Please enter a project name.')
      return
    }

    if (!/^[A-Z0-9]{2,10}$/.test(cleanKey)) {
      setError(
        'Project key must contain 2–10 uppercase letters or numbers.'
      )
      return
    }

    if (!workspaceId) {
      setError(
        'Please select a workspace before creating a project.'
      )
      return
    }

    setCreating(true)

    try {
      // Get the logged-in user.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        throw new Error('Please log in before creating a project.')
      }

      // Confirm that the selected workspace is still the one being used.
      const currentWorkspaceId = localStorage.getItem(
        'selectedWorkspaceId'
      )

      if (currentWorkspaceId !== workspaceId) {
        throw new Error(
          'Your selected workspace has changed. Please try again.'
        )
      }

      // Insert the project into the selected workspace.
      const {
        data,
        error: insertError,
      } = await supabase
        .from('projects')
        .insert({
          workspace_id: workspaceId,
          name: cleanName,
          project_key: cleanKey,
          description: cleanDescription || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Add the newly created project to the displayed list.
      setProjects((currentProjects) => [
        data,
        ...currentProjects,
      ])

      setMessage(`Project "${data.name}" created successfully!`)

      // Clear the form fields.
      setName('')
      setProjectKey('')
      setDescription('')
      setShowForm(false)
    } catch (err) {
      console.error('Error creating project:', err)

      if (err.code === '23505') {
        setError(
          'This project key already exists in your workspace. Choose another key.'
        )
      } else if (err.code === '42501') {
        setError(
          'You do not have permission to create a project in this workspace.'
        )
      } else {
        setError(err.message || 'Could not create the project.')
      }
    } finally {
      setCreating(false)
    }
  }

  // Render the Projects page.
  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-900 dark:text-slate-100">
      {/* Page heading and create button. */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Projects
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organize your team's work into projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm)
            setMessage('')
            setError('')
          }}
          disabled={!workspaceId || loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancel' : 'Create Project'}
        </button>
      </div>

      {/* Success message. */}
      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
        >
          {message}
        </div>
      )}

      {/* Error message. */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Create project form. */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            Create a new project
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter the details for your project.
          </p>

          <form
            onSubmit={handleCreateProject}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="project-name"
                className="mb-2 block text-sm font-medium"
              >
                Project name <span className="text-red-500">*</span>
              </label>

              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(event) =>
                  handleNameChange(event.target.value)
                }
                placeholder="e.g. Restaurant Ordering App"
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-900"
              />
            </div>

            <div>
              <label
                htmlFor="project-key"
                className="mb-2 block text-sm font-medium"
              >
                Project key <span className="text-red-500">*</span>
              </label>

              <input
                id="project-key"
                type="text"
                value={projectKey}
                onChange={(event) =>
                  setProjectKey(
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '')
                      .slice(0, 10)
                  )
                }
                placeholder="e.g. ROA"
                minLength={2}
                maxLength={10}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-900"
              />

              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Use 2–10 letters or numbers. This identifies your project.
              </p>
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="project-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="What is this project about?"
                rows={3}
                maxLength={1000}
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-blue-900"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                )}

                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project list. */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">All Projects</h2>

          {!loading && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {projects.length}{' '}
              {projects.length === 1 ? 'project' : 'projects'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
            <LoaderCircle
              size={24}
              className="animate-spin text-blue-600"
            />

            <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
              Loading projects...
            </span>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <FolderKanban size={28} />
            </div>

            <h3 className="mt-4 text-base font-semibold">
              No projects yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Create your first project to start organizing your team's work.
            </p>

            {workspaceId && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus size={18} />
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                onClick={() =>
                  navigate(`/projects/${project.id}`)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' ||
                    event.key === ' '
                  ) {
                    event.preventDefault()
                    navigate(`/projects/${project.id}`)
                  }
                }}
                role="link"
                tabIndex={0}
                aria-label={`Open project ${project.name}`}
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                    <FolderKanban size={22} />
                  </div>

                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {project.project_key}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold">
                  {project.name}
                </h3>

                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {project.description || 'No description provided.'}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span>
                    Created{' '}
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>

                  <ArrowUpRight
                    size={17}
                    className="transition group-hover:text-blue-600"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Projects