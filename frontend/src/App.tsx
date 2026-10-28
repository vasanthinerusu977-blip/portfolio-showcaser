
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import PortfolioEditor from './PortfolioEditor'
import Auth from './Auth'
import { supabase } from './supabase'

function App() {
  const [name, setName] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (mounted) {
        if (error) {
          console.error('Could not load session:', error.message)
        }

        setSession(data.session)
        setSessionLoading(false)
      }
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession)
        setSessionLoading(false)

        if (newSession) {
          setShowAuth(false)
        } else {
          setShowEditor(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(`Sign out failed: ${error.message}`)
      return
    }

    setShowAuth(false)
    setShowEditor(false)
    setName('')
  }

  if (sessionLoading) {
    return <main className="hero"><p>Checking your session...</p></main>
  }

  if (showAuth && !session) {
    return <Auth />
  }

  if (showEditor && session) {
    return <PortfolioEditor />
  }

  return (
    <div className="app">
      <nav className="navbar">
        <a className="logo" href="#">
          Portfolia<span>.</span>
        </a>

        <div>
          {session ? (
            <>
              <span>
                Signed in: {session.user.email}
              </span>
              <button onClick={() => void handleSignOut()}>
                Log out
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)}>
              Login / Sign up
            </button>
          )}

          <a className="nav-link" href="#create">
            Create portfolio
          </a>
        </div>
      </nav>

      <main>
        <section className="hero">
          <p className="eyebrow">YOUR WORK. YOUR STORY.</p>

          <h1>
            Your talent deserves
            <br />
            a <span>beautiful portfolio.</span>
          </h1>

          <p className="description">
            Create a professional portfolio, showcase your projects,
            and share your skills with the world. No design experience needed.
          </p>

          <div className="create-box" id="create">
            <label htmlFor="name">Let's start with your name</label>

            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <button
              onClick={() => {
                if (!session) {
                  setShowAuth(true)
                  return
                }

                if (name.trim()) {
                  setShowEditor(true)
                } else {
                  alert('Please enter your name first.')
                }
              }}
            >
              Create my portfolio →
            </button>

            <p className="small-text">
              {session
                ? 'You are signed in and ready to create.'
                : 'Sign in is required to create a portfolio.'}
            </p>
          </div>
        </section>

        <section className="features">
          <article>
            <span className="feature-icon">✦</span>
            <h2>Showcase your work</h2>
            <p>
              Bring your projects, skills, and achievements together.
            </p>
          </article>

          <article>
            <span className="feature-icon">◈</span>
            <h2>Make it yours</h2>
            <p>
              Build a portfolio that reflects your unique personality.
            </p>
          </article>

          <article>
            <span className="feature-icon">↗</span>
            <h2>Share with the world</h2>
            <p>
              Prepare a portfolio you can share with recruiters and clients.
            </p>
          </article>
        </section>
      </main>

      <footer>Made for your next big opportunity.</footer>
    </div>
  )
}

export default App
