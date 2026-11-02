// React hooks for storing and loading project member information.
import { useEffect, useState } from 'react'

// Icons used in the member management interface.
import {
  Users,
  Search,
  UserPlus,
  Trash2,
  LoaderCircle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

// Supabase client for database operations.
import { supabase } from '../../lib/supabaseClient'

function ProjectMembers({ projectId }) {
  // Store the members currently assigned to this project.
  const [members, setMembers] = useState([])

  // Store the Member ID entered in the search field.
  const [searchCode, setSearchCode] = useState('')

  // Store the member found by the search.
  const [foundMember, setFoundMember] = useState(null)

  // Track loading, searching, adding, and removing operations.
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState(null)

  // Store error and success messages.
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load the existing project members from Supabase.
  async function loadMembers() {
    setLoading(true)
    setError('')

    try {
      // Fetch the user IDs assigned to this project.
      const { data: membershipData, error: membershipError } =
        await supabase
          .from('project_members')
          .select('id, user_id, role, added_at')
          .eq('project_id', projectId)
          .order('added_at', { ascending: true })

      if (membershipError) {
        throw membershipError
      }

      // If the project has no members, show an empty list.
      if (!membershipData || membershipData.length === 0) {
        setMembers([])
        return
      }

      // Collect the user IDs so their public profile details can be loaded.
      const userIds = membershipData.map((membership) => membership.user_id)

      // Fetch names and Member IDs for those users.
      const { data: profileData, error: profileError } =
        await supabase
          .from('profiles')
          .select('id, full_name, member_code')
          .in('id', userIds)

      if (profileError) {
        throw profileError
      }

      // Match each membership record with its profile.
      const profileMap = new Map(
        (profileData || []).map((profile) => [profile.id, profile])
      )

      // Combine membership information with profile information.
      const combinedMembers = membershipData.map((membership) => ({
        ...membership,
        profile: profileMap.get(membership.user_id) || null,
      }))

      setMembers(combinedMembers)
    } catch (err) {
      setError(err.message || 'Unable to load project members.')
    } finally {
      setLoading(false)
    }
  }

  // Load members whenever this component receives a project ID.
  useEffect(() => {
    loadMembers()
  }, [projectId])

  // Search for a user using their unique Member ID.
  async function handleSearch(event) {
    event.preventDefault()

    // Clear messages and previous search results.
    setError('')
    setSuccess('')
    setFoundMember(null)

    // Remove spaces from the beginning and end of the Member ID.
    const cleanCode = searchCode.trim().toUpperCase()

    if (!cleanCode) {
      setError('Please enter a Member ID.')
      return
    }

    // Do not search if the entered ID belongs to an existing project member.
    const alreadyAdded = members.some(
      (member) => member.profile?.member_code === cleanCode
    )

    if (alreadyAdded) {
      setError('This person is already a member of this project.')
      return
    }

    setSearching(true)

    try {
      // Search the profiles table for an exact Member ID match.
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name, member_code')
        .eq('member_code', cleanCode)
        .maybeSingle()

      if (searchError) {
        throw searchError
      }

      if (!data) {
        setError('No user was found with that Member ID.')
        return
      }

      // Store the matching user for confirmation before adding them.
      setFoundMember(data)
    } catch (err) {
      setError(err.message || 'Unable to search for this member.')
    } finally {
      setSearching(false)
    }
  }

  // Add the selected person to the current project.
  async function handleAddMember() {
    if (!foundMember || adding) {
      return
    }

    setAdding(true)
    setError('')
    setSuccess('')

    try {
      // Insert a membership record for the selected user.
      // The database RLS policy checks whether the user belongs
      // to the workspace containing this project.
      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: foundMember.id,
          role: 'member',
        })

      if (insertError) {
        throw insertError
      }

      // Display confirmation and clear the search form.
      setSuccess(`${foundMember.full_name || 'Member'} was added to the project.`)
      setFoundMember(null)
      setSearchCode('')

      // Refresh the list to display the newly added member.
      await loadMembers()
    } catch (err) {
      // The database may reject the insert if the user is not in
      // the same workspace or is already a project member.
      setError(err.message || 'Unable to add this member.')
    } finally {
      setAdding(false)
    }
  }

  // Remove a person from the current project.
  async function handleRemoveMember(member) {
    // Ask for confirmation before removing the membership.
    const confirmed = window.confirm(
      `Remove ${member.profile?.full_name || 'this member'} from the project?`
    )

    if (!confirmed) {
      return
    }

    setRemovingId(member.id)
    setError('')
    setSuccess('')

    try {
      // Delete only the selected membership record.
      const { error: deleteError } = await supabase
        .from('project_members')
        .delete()
        .eq('id', member.id)
        .eq('project_id', projectId)

      if (deleteError) {
        throw deleteError
      }

      // Remove the member from the visible list immediately.
      setMembers((currentMembers) =>
        currentMembers.filter((item) => item.id !== member.id)
      )

      setSuccess('Project member removed successfully.')
    } catch (err) {
      setError(err.message || 'Unable to remove this member.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Section heading and member count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-800 dark:text-white">
            <Users size={21} />
            Project Members
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {members.length} {members.length === 1 ? 'member' : 'members'} assigned to this project
          </p>
        </div>
      </div>

      {/* Search form for finding users by Member ID */}
      <form
        onSubmit={handleSearch}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={searchCode}
            onChange={(event) => setSearchCode(event.target.value)}
            placeholder="Enter Member ID, e.g. MEM-A1B2C3D4E5"
            aria-label="Search by Member ID"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={searching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {searching ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Search size={17} />
          )}

          {searching ? 'Searching...' : 'Find Member'}
        </button>
      </form>

      {/* Display errors and success messages */}
      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
        >
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Show the found user and let the current user confirm the addition */}
      {foundMember && (
        <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40 sm:flex-row sm:items-center">
          <div>
            <p className="font-medium text-slate-800 dark:text-white">
              {foundMember.full_name || 'Unnamed member'}
            </p>

            <p className="mt-1 font-mono text-sm text-slate-600 dark:text-slate-300">
              {foundMember.member_code}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddMember}
            disabled={adding}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {adding ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <UserPlus size={17} />
            )}

            {adding ? 'Adding...' : 'Add to Project'}
          </button>
        </div>
      )}

      {/* Display the current project's members */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Current Members
        </h3>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle size={18} className="animate-spin" />
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
            <Users size={28} className="mx-auto text-slate-400" />

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No members have been added to this project yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {/* Avatar using the first letter of the member's name */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {(member.profile?.full_name || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-800 dark:text-white">
                      {member.profile?.full_name || 'Unnamed member'}
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {member.profile?.member_code || 'Member ID unavailable'}
                    </p>

                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Remove the membership after user confirmation */}
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  disabled={removingId === member.id}
                  aria-label={`Remove ${member.profile?.full_name || 'member'}`}
                  title="Remove member"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  {removingId === member.id ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}

                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default ProjectMembers