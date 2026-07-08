import { useState } from 'react'
import { login } from '../api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-zinc-800 border border-zinc-700/60 rounded-2xl p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">Email triage dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to continue</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-zinc-900 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
