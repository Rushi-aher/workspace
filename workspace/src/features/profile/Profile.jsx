import { useEffect, useState } from 'react'
import { Copy, Check, UserRound, Save, LoaderCircle } from 'lucide-react'

import { supabase } from '../../lib/supabaseClient'

function Profile() {
  // Store the signed-in user's profile information.
  const [profile, setProfile] = useState({
    id: '',
    full_name: '',
    member_code: '',
    email: '',
  })

  // Track loading, saving, and feedback messages.
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load the signed-in user's Auth details and profile from Supabase.
  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setError('')

      try {
        // Get the currently signed-in user.
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) throw userError

        if (!user) {
          setError('You must be logged in to view your profile.')
          return
        }

        // Fetch the user's profile using their authenticated user ID.
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, member_code')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        // Store the profile information and email in React state.
        setProfile({
          id: user.id,
          full_name: data.full_name ?? '',
          member_code: data.member_code ?? '',
          email: user.email ?? '',
        })
      } catch (err) {
        setError(err.message || 'Unable to load your profile.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  // Copy the unique Member ID to the clipboard.
  async function handleCopyMemberId() {
    if (!profile.member_code) return

    try {
      await navigator.clipboard.writeText(profile.member_code)
      setCopied(true)

      // Reset the button label after a short delay.
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Unable to copy the Member ID. Please copy it manually.')
    }
  }

  // Save the edited name to the current user's profile record.
  async function handleSaveProfile(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const updatedName = profile.full_name.trim()

    if (!updatedName) {
      setError('Full name cannot be empty.')
      return
    }

    setSaving(true)

    try {
      // Update only the signed-in user's profile.
      // The profiles table's RLS policy must restrict updates to the owner.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: updatedName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      // Keep the displayed name in sync with the saved value.
      setProfile((currentProfile) => ({
        ...currentProfile,
        full_name: updatedName,
      }))

      setEditing(false)
      setSuccess('Your profile was updated successfully.')
    } catch (err) {
      setError(err.message || 'Unable to update your profile.')
    } finally {
      setSaving(false)
    }
  }

  // Show a loading message while Supabase returns the profile.
  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <LoaderCircle size={22} className="animate-spin" />
        <span>Loading your profile...</span>
      </div>
    )
  }

  // Show an error if the profile could not be loaded.
  if (error && !profile.id) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-white p-5 text-red-600 dark:border-red-900 dark:bg-slate-900 dark:text-red-300"
      >
        {error}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          View and manage your account information.
        </p>
      </div>

      {/* Profile summary card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center gap-4">
          {/* Profile avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            <UserRound size={30} />
          </div>

          <div className="min-w-0">
            <h2 className="break-words text-xl font-semibold text-slate-800 dark:text-white">
              {profile.full_name || 'Your Name'}
            </h2>

            <p className="break-all text-sm text-slate-500 dark:text-slate-400">
              {profile.email}
            </p>
          </div>
        </div>
      </section>

      {/* Profile information and edit form */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Personal Information
          </h2>

          {!editing && (
            <button
              type="button"
              onClick={() => {
                setError('')
                setSuccess('')
                setEditing(true)
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Display feedback messages */}
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
          >
            {success}
          </p>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Full name can be edited */}
          <div>
            <label
              htmlFor="full_name"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Full Name
            </label>

            <input
              id="full_name"
              type="text"
              value={profile.full_name}
              onChange={(event) =>
                setProfile((currentProfile) => ({
                  ...currentProfile,
                  full_name: event.target.value,
                }))
              }
              disabled={!editing || saving}
              maxLength={100}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
            />
          </div>

          {/* Email is displayed but cannot be edited here */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            />

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Your email address is managed by your authentication account.
            </p>
          </div>

          {/* Unique Member ID with a copy button */}
          <div>
            <label
              htmlFor="member_code"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Member ID
            </label>

            <div className="flex flex-wrap gap-2">
              <input
                id="member_code"
                type="text"
                value={profile.member_code}
                readOnly
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />

              <button
                type="button"
                onClick={handleCopyMemberId}
                disabled={!profile.member_code}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Share this ID with workspace members who need to find your account.
              It identifies your account but does not grant access by itself.
            </p>
          </div>

          {/* Show save and cancel actions only while editing */}
          {editing && (
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}

                {saving ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  // Reload the saved name when the user cancels editing.
                  setProfile((currentProfile) => ({
                    ...currentProfile,
                    full_name:
                      document.getElementById('full_name')?.defaultValue ??
                      currentProfile.full_name,
                  }))

                  setError('')
                  setSuccess('')
                  setEditing(false)

                  // Reloading the page will fetch the saved name again if needed.
                  window.location.reload()
                }}
                className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  )
}

export default Profile