import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  User,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

function Signup() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  async function handleSignup(event) {
    event.preventDefault()

    setMessage('')
    setMessageType('info')

    if (password.length < 8) {
      setMessage('Password must contain at least 8 characters.')
      setMessageType('error')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setMessageType('error')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.session) {
        setMessage(
          'Your account was created successfully! You can now continue to sign in.'
        )
        setMessageType('success')

        setTimeout(() => {
          navigate('/login')
        }, 1500)
      } else {
        setMessage(
          'Account created! Check your email for a confirmation link before signing in.'
        )
        setMessageType('success')
      }
    } catch (error) {
      setMessage(
        error.message || 'Unable to create your account. Please try again.'
      )
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const messageStyles =
    messageType === 'error'
      ? 'bg-red-50 text-red-700'
      : messageType === 'success'
        ? 'bg-green-50 text-green-700'
        : 'bg-blue-50 text-blue-700'

  return (
    <div className="flex min-h-screen bg-white">

      {/* Left branding panel */}
      <section className="relative hidden w-5/12 flex-col overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-12 text-white md:flex lg:w-1/2">
        <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-white/5" />

        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/20" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <FolderKanban size={27} />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            Workspace
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
            Bring your team
            <br />
            together.
          </h1>

          <p className="mt-6 max-w-sm text-base leading-7 text-blue-100">
            Create your account and start organizing projects,
            managing tickets, and collaborating with your team.
          </p>
        </div>

        <p className="relative z-10 text-sm text-blue-100/80">
          One place for your team's best work.
        </p>
      </section>

      {/* Right signup panel */}
      <section className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-10 md:w-7/12 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <FolderKanban size={23} />
            </div>

            <span className="text-xl font-bold text-slate-900">
              Workspace
            </span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Create an account
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Get started with your Workspace account.
            </p>
          </div>

          {/* Signup form */}
          <form onSubmit={handleSignup} className="space-y-4">

            {/* Full name */}
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>

              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="signupEmail"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="signupEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signupPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="signupPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Create account button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {/* Feedback message */}
          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-4 rounded-lg p-3 text-sm leading-6 ${messageStyles}`}
            >
              {message}
            </p>
          )}

          {/* Sign in link */}
          <p className="mt-7 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Sign in
            </button>
          </p>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Check size={14} />
            Simple project and team management.
          </div>
        </div>
      </section>
    </div>
  )
}

export default Signup