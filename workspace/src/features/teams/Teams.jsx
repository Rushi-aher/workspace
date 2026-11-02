// React hooks for storing state and loading workspace data.
import { useEffect, useMemo, useState } from 'react'

// Icons used throughout the Teams page.
import {
  Users,
  LoaderCircle,
  AlertCircle,
  Search,
  UserPlus,
  RefreshCw,
  UserRound,
  CalendarDays,
  CheckCircle2,
  X,
} from 'lucide-react'

// Supabase client used to communicate with the database.
import { supabase } from '../../lib/supabaseClient'

function Teams() {
  // Store the current workspace and its members.
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])

  // Store the Member ID entered when adding a new member.
  const [memberCode, setMemberCode] = useState('')

  // Store the profile found by the Member ID search.
  const [searchResult, setSearchResult] = useState(null)

  // Store the text used to filter existing workspace members.
  const [memberFilter, setMemberFilter] = useState('')

  // Track loading and action states.
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)

  // Store error and success messages separately.
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Create initials from a member's name for the avatar.
  function getInitials(name) {
    if (!name || !name.trim()) return '?'

    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  }

  // Format a database timestamp as a readable date.
  function formatDate(dateValue) {
    if (!dateValue) return 'Date unavailable'

    const date = new Date(dateValue)

    // Avoid displaying an invalid date if the database value is unexpected.
    if (Number.isNaN(date.getTime())) return 'Date unavailable'

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Load the logged-in user's workspace and its member list.
  async function loadWorkspaceMembers(showRefresh = false) {
    // Show the full-page loader on the initial load.
    // Use a smaller refresh state when reloading existing data.
    if (showRefresh && members.length > 0) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      // Get the currently logged-in user from Supabase Auth.
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) throw userError

      const user = userData.user

      if (!user) {
        throw new Error('Please log in to view workspace members.')
      }

      // Find the workspace the user most recently joined.
      const { data: membership, error: membershipError } =
        await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle()

      if (membershipError) throw membershipError

      // Stop if the user does not belong to a workspace.
      if (!membership) {
        setWorkspace(null)
        setMembers([])
        throw new Error('You have not joined a workspace yet.')
      }

      // Load the selected workspace's basic information.
      const { data: workspaceData, error: workspaceError } =
        await supabase
          .from('workspaces')
          .select('id, name, description')
          .eq('id', membership.workspace_id)
          .single()

      if (workspaceError) throw workspaceError

      setWorkspace(workspaceData)

      // Fetch all membership records belonging to this workspace.
      const { data: membershipData, error: membersError } =
        await supabase
          .from('workspace_members')
          .select('user_id, role, joined_at')
          .eq('workspace_id', workspaceData.id)
          .order('joined_at', { ascending: true })

      if (membersError) throw membersError
        // TEMPORARY DEBUG: Check which members the Teams page receives.
          console.log('Workspace ID:', workspaceData.id)
          console.log('Workspace memberships:', membershipData)  

      // Extract user IDs to retrieve their profile information.
      const userIds = (membershipData || []).map(
        (member) => member.user_id
      )

      // Handle an empty workspace without making an unnecessary query.
      if (userIds.length === 0) {
        setMembers([])
        return
      }

      // Retrieve the names and Member IDs of workspace members.
      const { data: profiles, error: profilesError } =
        await supabase
          .from('profiles')
          .select('id, full_name, member_code')
          .in('id', userIds)

      if (profilesError) throw profilesError

      // Create a map so each membership can find its matching profile.
      const profileById = new Map(
        (profiles || []).map((profile) => [
          profile.id,
          profile,
        ])
      )

      // Combine each membership record with its profile information.
      const combinedMembers = (membershipData || []).map(
        (member) => ({
          ...member,
          profile: profileById.get(member.user_id) || null,
        })
      )

      setMembers(combinedMembers)
    } catch (err) {
      // Show a readable error instead of silently failing.
      setError(err.message || 'Could not load workspace members.')
    } finally {
      // Stop all page and refresh loading indicators.
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load workspace information when the page first opens.
  useEffect(() => {
    loadWorkspaceMembers()
  }, [])

  // Filter existing members by name, Member ID, or role.
  const filteredMembers = useMemo(() => {
    const searchText = memberFilter.trim().toLowerCase()

    // Show all members when the filter is empty.
    if (!searchText) return members

    // Keep members whose name, Member ID, or role matches.
    return members.filter((member) => {
      const name = member.profile?.full_name || ''
      const code = member.profile?.member_code || ''
      const role = member.role || ''

      return (
        name.toLowerCase().includes(searchText) ||
        code.toLowerCase().includes(searchText) ||
        role.toLowerCase().includes(searchText)
      )
    })
  }, [members, memberFilter])

  // Search the profiles table for a registered user by Member ID.
  async function handleSearch(event) {
    event.preventDefault()

    // Clear messages and previous search results.
    setError('')
    setMessage('')
    setSearchResult(null)

    // Normalize the Member ID before searching.
    const code = memberCode.trim().toUpperCase()

    if (!code) {
      setError('Please enter a Member ID.')
      return
    }

    setSearching(true)

    try {
      // Find the registered user's profile.
      const { data: profile, error: searchError } =
        await supabase
          .from('profiles')
          .select('id, full_name, member_code')
          .eq('member_code', code)
          .maybeSingle()

      if (searchError) throw searchError

      // Inform the user if no profile matches the entered ID.
      if (!profile) {
        setMessage(
          'No registered user was found with that Member ID.'
        )
        return
      }

      // Prevent the user from adding someone who is already a member.
      const alreadyMember = members.some(
        (member) => member.user_id === profile.id
      )

      if (alreadyMember) {
        setMessage(
          'This person is already a member of your workspace.'
        )
        return
      }

      // Display the matching profile for confirmation.
      setSearchResult(profile)
    } catch (err) {
      setError(
        err.message || 'Could not search for this Member ID.'
      )
    } finally {
      setSearching(false)
    }
  }

  // Add the selected registered user to the current workspace.
  async function handleAddMember() {
    // Ensure a workspace and search result are available.
    if (!workspace || !searchResult) return

    setAdding(true)
    setError('')
    setMessage('')

    try {
      // Create a membership record for the selected user.
      // Supabase RLS policies determine whether this action is allowed.
      const { error: insertError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: searchResult.id,
          role: 'member',
        })

      if (insertError) throw insertError

      // Clear the search after a successful addition.
      setSearchResult(null)
      setMemberCode('')
      setMessage('Member added successfully.')

      // Reload the list so the new member appears immediately.
      await loadWorkspaceMembers(true)
    } catch (err) {
      // Display database or permission errors.
      setError(
        err.message ||
          'Could not add this member. Check your workspace permissions.'
      )
    } finally {
      setAdding(false)
    }
  }

  // Display a full-page loading state during the initial fetch.
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-6 text-slate-600 dark:text-slate-300">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        <span>Loading team members...</span>
      </div>
    )
  }

  // Render the Teams page.
  return (
    <div className="space-y-6">
      {/* Page heading, workspace name, and refresh action. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Icon used to identify the Teams page. */}
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <Users className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Teams
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage members of {workspace?.name || 'your workspace'}
            </p>
          </div>
        </div>

        {/* Reload workspace members without leaving the page. */}
        <button
          type="button"
          onClick={() => loadWorkspaceMembers(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Display page-level loading errors. */}
      {error && !workspace && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Unable to load Teams</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Add-member section with Member ID search. */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          {/* Icon that identifies the add-member action. */}
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <UserPlus className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">
              Add a workspace member
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Find a registered user using their unique Member ID.
            </p>
          </div>
        </div>

        {/* Form for searching registered users. */}
        <form
          onSubmit={handleSearch}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            {/* Search icon inside the Member ID input. */}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={memberCode}
              onChange={(event) => {
                // Update the search input and clear stale results.
                setMemberCode(event.target.value)
                setSearchResult(null)
                setMessage('')
                setError('')
              }}
              placeholder="Enter Member ID (e.g. MEM-XXXXXXXXXX)"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900"
            />
          </div>

          {/* Submit the Member ID search. */}
          <button
            type="submit"
            disabled={searching || adding}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searching ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Show the selected user before adding them. */}
        {searchResult && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {/* Generate an avatar using the user's initials. */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {getInitials(searchResult.full_name)}
              </div>

              <div>
                <p className="font-medium text-slate-800 dark:text-white">
                  {searchResult.full_name || 'Name not provided'}
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {searchResult.member_code}
                </p>
              </div>
            </div>

            {/* Confirm adding the selected user to the workspace. */}
            <button
              type="button"
              onClick={handleAddMember}
              disabled={adding}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {adding ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {adding ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        )}

        {/* Display success messages. */}
        {message && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        {/* Display search or add-member errors. */}
        {error && workspace && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </section>

      {/* Summary cards showing workspace member totals. */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total team members
            </p>

            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>

          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">
            {members.length}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            People in this workspace
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Workspace administrators
            </p>

            <UserRound className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>

          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">
            {
              members.filter(
                (member) =>
                  member.role === 'owner' ||
                  member.role === 'admin'
              ).length
            }
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Owners and admins
          </p>
        </div>
      </section>

      {/* Member directory and its search filter. */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Directory heading and member search input. */}
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">
                Workspace members
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Showing {filteredMembers.length} of {members.length} members
              </p>
            </div>

            {/* Search existing members by name, Member ID, or role. */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={memberFilter}
                onChange={(event) =>
                  setMemberFilter(event.target.value)
                }
                placeholder="Filter members..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-900"
              />

              {/* Clear the member filter when clicked. */}
              {memberFilter && (
                <button
                  type="button"
                  onClick={() => setMemberFilter('')}
                  aria-label="Clear member filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Show a helpful message if the directory is empty. */}
        {members.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />

            <p className="mt-3 font-medium text-slate-700 dark:text-slate-200">
              No workspace members found
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Members will appear here when they join this workspace.
            </p>
          </div>
        ) : filteredMembers.length === 0 ? (
          // Show a separate message when the filter finds no matches.
          <div className="p-10 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />

            <p className="mt-3 font-medium text-slate-700 dark:text-slate-200">
              No matching members
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try a different name, Member ID, or role.
            </p>
          </div>
        ) : (
          // Render each member as a row in the directory.
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMembers.map((member) => {
              // Use a fallback name when the profile has no full name.
              const name =
                member.profile?.full_name || 'Name not provided'

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Avatar, name, and Member ID. */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {getInitials(name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-white">
                        {name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {member.profile?.member_code ||
                          'Member ID unavailable'}
                      </p>
                    </div>
                  </div>

                  {/* Role and join date for each workspace member. */}
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : member.role === 'admin'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {member.role}
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <CalendarDays className="h-4 w-4" />
                      Joined {formatDate(member.joined_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default Teams