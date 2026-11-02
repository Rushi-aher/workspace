import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const DEV_ACCOUNTS = [
  { label: 'Admin', email: 'admin01@gmail.com' },
  { label: 'Employee 01', email: 'employee01@gmail.com' },
  { label: 'Employee 02', email: 'employee02@gmail.com' },
]

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info')

  const messageStyles =
    messageType === 'error'
      ? 'bg-red-50 text-red-700'
      : messageType === 'success'
        ? 'bg-green-50 text-green-700'
        : 'bg-blue-50 text-blue-700'

  function fillAccount(account) {
    setEmail(account.email)
    setPassword('00000000')
    setMessage('')
  }

  async function handleLogin(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error

      setMessage('Login successful! Redirecting...')
      setMessageType('success')

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setMessage(error.message || 'Unable to sign in. Please try again.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim()

    if (!cleanEmail) {
      setMessage('Enter your email address first.')
      setMessageType('error')
      return
    }

    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (error) throw error

      setMessage(
        'If an account exists for this email, a recovery link will be sent. Check your inbox.'
      )
      setMessageType('success')
    } catch (error) {
      setMessage(error.message || 'Unable to send the recovery email.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen bg-white">
      {/* Temporary Credentials: development only */}
      {import.meta.env.DEV && (
        <div className="group fixed bottom-4 left-4 z-50">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-md transition hover:border-blue-300 hover:text-blue-600"
          >
            Temporary Credentials
          </button>

          <div className="invisible absolute bottom-full left-0 mb-2 w-60 translate-y-2 rounded-xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Select an account
            </p>

            {DEV_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillAccount(account)}
                className="mb-1 w-full rounded-lg px-3 py-2 text-left transition hover:bg-blue-50"
              >
                <span className="block text-sm font-medium text-slate-800">
                  {account.label}
                </span>

                <span className="block break-all text-xs text-slate-500">
                  {account.email}
                </span>
              </button>
            ))}

            <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
              Shared password:{' '}
              <span className="font-semibold">00000000</span>
            </div>
          </div>
        </div>
      )}

      {/* Left branding panel */}
      <section className="relative hidden w-5/12 flex-col overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-12 text-white md:flex lg:w-1/2">
        <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/20" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <FolderKanban size={27} strokeWidth={2.2} />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            Workspace
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
            Work better.
            <br />
            Together.
          </h1>

          <p className="mt-6 max-w-sm text-base leading-7 text-blue-100">
            Organize your work, collaborate with your team,
            and keep every project moving forward.
          </p>

          <div className="mt-10 flex items-center gap-3">
            <div className="h-1.5 w-10 rounded-full bg-white" />
            <div className="h-1.5 w-5 rounded-full bg-white/40" />
            <div className="h-1.5 w-5 rounded-full bg-white/40" />
          </div>
        </div>

        <p className="relative z-10 text-sm text-blue-100/80">
          One place for your team's best work.
        </p>
      </section>

      {/* Right login panel */}
      <section className="flex min-h-screen w-full items-center justify-center bg-white px-6 py-12 md:w-7/12 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center justify-center gap-2 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <FolderKanban size={23} />
            </div>

            <span className="text-xl font-bold text-slate-900">
              Workspace
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome back!
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Sign in to your Workspace account.
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
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
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
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
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                Remember me
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700 disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {/* Feedback message */}
          {message && (
            <p
              role="status"
              aria-live="polite"
              className={`mt-5 rounded-lg p-3 text-sm leading-6 ${messageStyles}`}
            >
              {message}
            </p>
          )}

          {/* Signup link */}
          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Sign up
            </button>
          </p>

          {/* Footer */}
          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Check size={14} />
            Your team's work, organized in one place.
          </div>
        </div>
      </section>
    </div>
  )
}

export default Login