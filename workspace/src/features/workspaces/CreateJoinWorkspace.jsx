import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Users,
  ArrowRight,
  ArrowLeft,
  FolderKanban,
  Mail,
} from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

function CreateJoinWorkspace() {
  const navigate = useNavigate()

  const [activeForm, setActiveForm] = useState(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [loading, setLoading] = useState(false)

  async function handleCreateWorkspace(event) {
    event.preventDefault()
    setMessage('')

    const cleanName = workspaceName.trim()
    const cleanDescription = description.trim()

    // Validate the workspace name.
    if (!cleanName) {
      setMessageType('error')
      setMessage('Please enter a workspace name.')
      return
    }

    setLoading(true)

    try {
      // Check whether the user is logged in.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setMessageType('error')
        setMessage('Please log in before creating a workspace.')
        return
      }

      // Create the workspace and owner membership through Supabase RPC.
      const { data, error } = await supabase.rpc(
        'create_workspace_with_owner',
        {
          workspace_name: cleanName,
          workspace_description: cleanDescription || null,
        }
      )

      if (error) {
        throw error
      }

      // Confirm that the new workspace ID was returned.
      if (!data?.id) {
        throw new Error(
          'The workspace was not created successfully. Please try again.'
        )
      }

      // Save the newly created workspace as the selected workspace.
      localStorage.setItem('selectedWorkspaceId', data.id)

      // Notify the sidebar to reload the user's workspace list.
      window.dispatchEvent(new Event('workspacesUpdated'))

      // Display a success message.
      setMessageType('success')
      setMessage(
        `Workspace "${data.name || cleanName}" created successfully! Redirecting...`
      )

      // Navigate to the dashboard after successful creation.
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Workspace creation error:', error)

      setMessageType('error')
      setMessage(
        error.message ||
          'Could not create the workspace. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleJoinWorkspace(event) {
    event.preventDefault()

    if (!inviteCode.trim()) {
      setMessageType('error')
      setMessage('Please enter an invitation code.')
      return
    }

    // Joining is not implemented until the invitation system is added.
    setMessageType('error')
    setMessage(
      'Joining workspaces is not connected yet. We will implement invitations next.'
    )
  }

  function openForm(form) {
    setActiveForm(form)
    setMessage('')
  }

  function goBack() {
    if (loading) return

    setActiveForm(null)
    setMessage('')
  }

  const messageClasses =
    messageType === 'error'
      ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-10 transition-colors dark:bg-slate-950 sm:px-8">
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <FolderKanban size={28} />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to Workspace!
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
            Organize your work, collaborate with your team,
            and keep every project moving forward.
          </p>
        </div>

        {!activeForm && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-colors hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                <Plus size={25} />
              </div>

              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Create a Workspace
              </h2>

              <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Start a new workspace, organize your projects,
                and invite people to collaborate with you.
              </p>

              <ul className="my-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Users size={17} className="text-blue-600" />
                  Invite your team members
                </li>

                <li className="flex items-center gap-2">
                  <FolderKanban size={17} className="text-blue-600" />
                  Manage projects and tickets
                </li>
              </ul>

              <button
                type="button"
                onClick={() => openForm('create')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Create Workspace
                <ArrowRight size={17} />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-colors hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
                <Users size={25} />
              </div>

              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Join a Workspace
              </h2>

              <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Already invited to a workspace? Join an
                existing team using its invitation code.
              </p>

              <ul className="my-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Mail size={17} className="text-violet-600" />
                  Use your team invitation
                </li>

                <li className="flex items-center gap-2">
                  <Users size={17} className="text-violet-600" />
                  Collaborate with your team
                </li>
              </ul>

              <button
                type="button"
                onClick={() => openForm('join')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Join Workspace
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {activeForm === 'create' && (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
            <button
              type="button"
              onClick={goBack}
              disabled={loading}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50 dark:hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to options
            </button>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Create your workspace
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Give your team a name so everyone knows where to collaborate.
            </p>

            <form
              onSubmit={handleCreateWorkspace}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="workspaceName"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Workspace name
                </label>

                <input
                  id="workspaceName"
                  type="text"
                  value={workspaceName}
                  onChange={(event) =>
                    setWorkspaceName(event.target.value)
                  }
                  placeholder="e.g. E-Commerce Development"
                  maxLength={100}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-950"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Description
                  <span className="ml-2 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="What will your team work on?"
                  maxLength={500}
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-950"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating workspace...' : 'Create Workspace'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            {message && (
              <p
                role={messageType === 'error' ? 'alert' : 'status'}
                className={`mt-5 rounded-lg p-3 text-sm leading-6 ${messageClasses}`}
              >
                {message}
              </p>
            )}
          </div>
        )}

        {activeForm === 'join' && (
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
            <button
              type="button"
              onClick={goBack}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to options
            </button>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Join a workspace
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Enter the invitation code provided by your workspace admin.
            </p>

            <form
              onSubmit={handleJoinWorkspace}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="inviteCode"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Invitation code
                </label>

                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(event) =>
                    setInviteCode(event.target.value)
                  }
                  placeholder="Enter your invitation code"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-violet-950"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Join Workspace
                <ArrowRight size={17} />
              </button>
            </form>

            {message && (
              <p
                role="alert"
                className={`mt-5 rounded-lg p-3 text-sm leading-6 ${messageClasses}`}
              >
                {message}
              </p>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-slate-400">
          One workspace for your team. One place to organize your work.
        </p>
      </div>
    </div>
  )
}

export default CreateJoinWorkspace