// React hooks for managing component state and loading data.
import { useEffect, useState } from 'react'

// Components and hooks for reading the URL and navigating between pages.
import { Link, useParams } from 'react-router-dom'

// Import the component that manages project members.
import ProjectMembers from './ProjectMembers'

// Icons used throughout the interface.
import {
  ArrowLeft,
  Plus,
  LoaderCircle,
  Ticket,
  AlertCircle,
  X,
  Pencil,
  Save,
} from 'lucide-react'

// Supabase client used to read and update database records.
import { supabase } from '../../lib/supabaseClient'

function ProjectDetails() {
  // Read the project ID from the current URL.
  const { projectId } = useParams()

  // Store information about the selected project.
  const [project, setProject] = useState(null)

  // Store all tickets belonging to this project.
  const [tickets, setTickets] = useState([])

  // Track whether the initial project and ticket data is loading.
  const [loading, setLoading] = useState(true)

  // Store errors from loading, creating, or updating tickets.
  const [error, setError] = useState('')

  // Control whether the new-ticket form is visible.
  const [showTicketForm, setShowTicketForm] = useState(false)

  // Track whether a new ticket is currently being saved.
  const [savingTicket, setSavingTicket] = useState(false)

  // Store the values entered into the new-ticket form.
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
  })

  // Store the ID of the ticket currently being edited.
  // null means that no ticket is being edited.
  const [editingTicketId, setEditingTicketId] = useState(null)

  // Store the values entered into the edit-ticket form.
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
  })

  // Track whether an existing ticket is currently being updated.
  const [updatingTicket, setUpdatingTicket] = useState(false)

  // Display success messages after creating or updating tickets.
  const [successMessage, setSuccessMessage] = useState('')

  // Fetch project details and its tickets from Supabase.
  async function loadProjectAndTickets() {
    setLoading(true)
    setError('')

    try {
      // Fetch the project matching the ID in the URL.
      const { data: projectData, error: projectError } =
        await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single()

      // Stop if the project query fails.
      if (projectError) {
        throw projectError
      }

      // Save the project information for display.
      setProject(projectData)

      // Fetch tickets belonging only to this project.
      const { data: ticketData, error: ticketError } =
        await supabase
          .from('tickets')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })

      // Stop if the ticket query fails.
      if (ticketError) {
        throw ticketError
      }

      // Save the retrieved tickets in React state.
      setTickets(ticketData || [])
    } catch (err) {
      // Display the database error in the page.
      setError(err.message || 'Failed to load project details.')
    } finally {
      // Stop the loading indicator regardless of the result.
      setLoading(false)
    }
  }

  // Load data when the page opens or the project ID changes.
  useEffect(() => {
    loadProjectAndTickets()
  }, [projectId])

  // Update a field in the new-ticket form.
  function handleFormChange(event) {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  // Open a ticket's edit form and copy its existing values into it.
  function handleStartEditing(ticket) {
    setEditingTicketId(ticket.id)

    setEditFormData({
      title: ticket.title,
      description: ticket.description || '',
      priority: ticket.priority,
      status: ticket.status,
    })

    // Close the creation form and clear old messages.
    setShowTicketForm(false)
    setError('')
    setSuccessMessage('')
  }

  // Update a field in the edit-ticket form.
  function handleEditFormChange(event) {
    const { name, value } = event.target

    setEditFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }))
  }

  // Save changes to an existing ticket in Supabase.
  async function handleUpdateTicket(event) {
    // Prevent the browser from reloading the page.
    event.preventDefault()

    // Avoid duplicate update requests.
    if (updatingTicket) {
      return
    }

    // Remove surrounding spaces from the title.
    const cleanTitle = editFormData.title.trim()

    // Do not allow an empty title.
    if (!cleanTitle) {
      setError('Please enter a ticket title.')
      return
    }

    setUpdatingTicket(true)
    setError('')
    setSuccessMessage('')

    try {
      // Update only the ticket currently being edited.
      // The project ID check adds another safeguard.
      const { data: updatedTicket, error: updateError } =
        await supabase
          .from('tickets')
          .update({
            title: cleanTitle,
            description: editFormData.description.trim() || null,
            priority: editFormData.priority,
            status: editFormData.status,
          })
          .eq('id', editingTicketId)
          .eq('project_id', projectId)
          .select()
          .single()

      // Stop if Supabase rejects the update.
      if (updateError) {
        throw updateError
      }

      // Replace the old ticket with its updated version.
      setTickets((previousTickets) =>
        previousTickets.map((ticket) =>
          ticket.id === updatedTicket.id
            ? updatedTicket
            : ticket
        )
      )

      // Close the edit form.
      setEditingTicketId(null)

      // Tell the user that the update worked.
      setSuccessMessage('Ticket updated successfully.')
    } catch (err) {
      // Display the reason the ticket could not be updated.
      setError(err.message || 'Failed to update ticket.')
    } finally {
      // Allow the user to edit tickets again.
      setUpdatingTicket(false)
    }
  }

  // Create a new ticket in Supabase.
  async function handleCreateTicket(event) {
    // Prevent the browser from reloading the page.
    event.preventDefault()

    // Avoid duplicate ticket creation requests.
    if (savingTicket) {
      return
    }

    // Validate the required ticket title.
    const cleanTitle = formData.title.trim()

    if (!cleanTitle) {
      setError('Please enter a ticket title.')
      return
    }

    setSavingTicket(true)
    setError('')
    setSuccessMessage('')

    try {
      // Get the currently logged-in user's ID.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        throw new Error('Please log in before creating a ticket.')
      }

      // Ask Supabase to generate the next ticket number.
      const { data: ticketNumber, error: numberError } =
        await supabase.rpc('get_next_ticket_number', {
          p_project_id: projectId,
        })

      if (numberError) {
        throw numberError
      }

      // Save the new ticket and its generated number.
      const { data: newTicket, error: insertError } =
        await supabase
          .from('tickets')
          .insert({
            project_id: projectId,
            title: cleanTitle,
            description: formData.description.trim() || null,
            priority: formData.priority,
            status: formData.status,
            ticket_number: ticketNumber,
            created_by: user.id,
          })
          .select()
          .single()

      if (insertError) {
        throw insertError
      }

      // Add the new ticket to the visible list.
      setTickets((previousTickets) => [
        newTicket,
        ...previousTickets,
      ])

      // Reset the creation form to its default values.
      setFormData({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'To Do',
      })

      // Close the form and display a success message.
      setShowTicketForm(false)
      setSuccessMessage('Ticket created successfully.')
    } catch (err) {
      // Display the reason the ticket could not be created.
      setError(err.message || 'Failed to create ticket.')
    } finally {
      // Allow the user to create another ticket.
      setSavingTicket(false)
    }
  }

  // Show a loading indicator while the initial data is fetched.
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <LoaderCircle size={20} className="animate-spin" />
        Loading project...
      </div>
    )
  }

  // Show an error if the initial project could not be loaded.
  if (error && !project) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>

        <Link
          to="/projects"
          className="mt-4 inline-block text-sm font-medium underline"
        >
          Back to Projects
        </Link>
      </div>
    )
  }

  // Handle an unknown project ID.
  if (!project) {
    return (
      <p className="text-slate-600 dark:text-slate-300">
        Project not found.
      </p>
    )
  }

  // Render project information, project members, and tickets.
  return (
    <div className="space-y-6">
      {/* Link back to the complete projects list. */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300"
      >
        <ArrowLeft size={16} />
        Back to Projects
      </Link>

      {/* Display the selected project's information. */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-blue-600">
          {project.project_key}
        </p>

        <h1 className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">
          {project.name}
        </h1>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {project.description || 'No project description provided.'}
        </p>

        <p className="mt-4 text-xs text-slate-500">
          Created: {new Date(project.created_at).toLocaleDateString()}
        </p>
      </section>

      {/* Display the members assigned to this project. */}
      <ProjectMembers projectId={projectId} />

      {/* Ticket section containing creation, editing, and the ticket list. */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {/* Heading and button to open the new-ticket form. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
              Tickets
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} in this project
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              // Open the ticket form and clear previous messages.
              setShowTicketForm(true)
              setEditingTicketId(null)
              setError('')
              setSuccessMessage('')
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Ticket
          </button>
        </div>

        {/* Display operation messages. */}
        {successMessage && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
          >
            {successMessage}
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Form for creating a new ticket. */}
        {showTicketForm && (
          <form
            onSubmit={handleCreateTicket}
            className="mt-6 space-y-4 rounded-xl border border-slate-200 p-5 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 dark:text-white">
                Create a Ticket
              </h3>

              <button
                type="button"
                onClick={() => setShowTicketForm(false)}
                disabled={savingTicket}
                aria-label="Close ticket form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Required title field. */}
            <div>
              <label
                htmlFor="ticket-title"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Title *
              </label>

              <input
                id="ticket-title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleFormChange}
                maxLength={200}
                required
                placeholder="e.g. Fix login page validation"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* Optional description field. */}
            <div>
              <label
                htmlFor="ticket-description"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Description
              </label>

              <textarea
                id="ticket-description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows={4}
                placeholder="Describe the task or problem..."
                className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {/* Select the new ticket's priority. */}
            <div>
              <label
                htmlFor="ticket-priority"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Priority
              </label>

              <select
                id="ticket-priority"
                name="priority"
                value={formData.priority}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Select the new ticket's initial status. */}
            <div>
              <label
                htmlFor="ticket-status"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Status
              </label>

              <select
                id="ticket-status"
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            {/* Create or cancel the new ticket. */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTicketForm(false)}
                disabled={savingTicket}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingTicket}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingTicket && (
                  <LoaderCircle size={16} className="animate-spin" />
                )}
                {savingTicket ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        )}

        {/* Show an empty state if there are no tickets. */}
        {tickets.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
            <Ticket size={32} className="mx-auto text-slate-400" />

            <h3 className="mt-3 font-medium text-slate-800 dark:text-white">
              No tickets yet
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create your first ticket using the Add Ticket button.
            </p>
          </div>
        ) : (
          /* Display every ticket belonging to this project. */
          <div className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="py-4">
                {/* Show the edit form for the selected ticket. */}
                {editingTicketId === ticket.id ? (
                  <form
                    onSubmit={handleUpdateTicket}
                    className="space-y-4 rounded-xl border border-blue-200 p-4 dark:border-blue-900"
                  >
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                      Edit {project.project_key}-{ticket.ticket_number}
                    </h3>

                    {/* Edit the ticket title. */}
                    <div>
                      <label
                        htmlFor={`edit-title-${ticket.id}`}
                        className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Title *
                      </label>

                      <input
                        id={`edit-title-${ticket.id}`}
                        name="title"
                        value={editFormData.title}
                        onChange={handleEditFormChange}
                        maxLength={200}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    {/* Edit the ticket description. */}
                    <div>
                      <label
                        htmlFor={`edit-description-${ticket.id}`}
                        className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Description
                      </label>

                      <textarea
                        id={`edit-description-${ticket.id}`}
                        name="description"
                        value={editFormData.description}
                        onChange={handleEditFormChange}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    {/* Edit the ticket priority. */}
                    <div>
                      <label
                        htmlFor={`edit-priority-${ticket.id}`}
                        className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Priority
                      </label>

                      <select
                        id={`edit-priority-${ticket.id}`}
                        name="priority"
                        value={editFormData.priority}
                        onChange={handleEditFormChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Edit the ticket status. */}
                    <div>
                      <label
                        htmlFor={`edit-status-${ticket.id}`}
                        className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Status
                      </label>

                      <select
                        id={`edit-status-${ticket.id}`}
                        name="status"
                        value={editFormData.status}
                        onChange={handleEditFormChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>

                    {/* Save changes or cancel editing. */}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingTicketId(null)}
                        disabled={updatingTicket}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={updatingTicket}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {updatingTicket ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        {updatingTicket ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Normal ticket display with its Edit button. */
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <Ticket
                        size={20}
                        className="mt-1 shrink-0 text-slate-400"
                      />

                      <div className="min-w-0">
                        {/* Display the ticket key, such as WORK-1. */}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {project.project_key}-{ticket.ticket_number}
                        </p>

                        <h3 className="mt-1 font-medium text-slate-800 dark:text-white">
                          {ticket.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {ticket.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Display the current status. */}
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {ticket.status}
                      </span>

                      {/* Display the current priority. */}
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {ticket.priority}
                      </span>

                      {/* Open the edit form for this ticket. */}
                      <button
                        type="button"
                        onClick={() => handleStartEditing(ticket)}
                        aria-label={`Edit ${ticket.title}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ProjectDetails