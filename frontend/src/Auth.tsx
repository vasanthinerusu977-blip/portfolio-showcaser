
import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAuth() {
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setMessage('Login successful!')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })

        if (error) throw error

        setMessage(
          'Account created! Check your email to confirm your account.'
        )
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      <p>
        {isLogin
          ? 'Log in to continue building your portfolio.'
          : 'Sign up to start building your portfolio.'}
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleAuth()
        }}
      >
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          minLength={6}
          required
        />

        <button type="submit" disabled={loading}>
          {loading
            ? 'Please wait...'
            : isLogin
              ? 'Log in'
              : 'Create account'}
        </button>
      </form>

      <p role="status">{message}</p>

      <button
        type="button"
        onClick={() => {
          setIsLogin(!isLogin)
          setMessage('')
        }}
      >
        {isLogin
          ? 'Need an account? Sign up'
          : 'Already have an account? Log in'}
      </button>
    </div>
  )
}
