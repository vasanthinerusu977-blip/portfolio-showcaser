
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

type PortfolioData = {
  name: string
  role: string
  about: string
  skills: string
  project: string
  github: string
  linkedin: string
  email: string
}

type Template = 'minimal' | 'dark-pro' | 'creative'

type PortfolioRow = PortfolioData & {
  id: string
  template: Template
}

const STORAGE_KEY = 'portfolia-portfolio'
const TEMPLATE_KEY = 'portfolia-template'

const emptyPortfolio: PortfolioData = {
  name: '',
  role: '',
  about: '',
  skills: '',
  project: '',
  github: '',
  linkedin: '',
  email: '',
}

function PortfolioEditor() {
  const [portfolio, setPortfolio] =
    useState<PortfolioData>(emptyPortfolio)
  const [selectedTemplate, setSelectedTemplate] =
    useState<Template>('dark-pro')
  const [portfolioId, setPortfolioId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] =
    useState('Loading your portfolio...')

  // Temporary security-test state
  const [testPortfolioId, setTestPortfolioId] = useState('')
  const [securityTestMessage, setSecurityTestMessage] = useState('')

  // Load the signed-in user's portfolio.
  useEffect(() => {
    let active = true

    async function loadPortfolio() {
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser()

        if (userError) throw userError

        const user = userData.user

        if (!user) {
          throw new Error('Please sign in to edit your portfolio.')
        }

        const { data, error } = await supabase
          .from('portfolios')
          .select(
            'id, name, role, about, skills, project, github, linkedin, email, template'
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) throw error
        if (!active) return

        if (data) {
          const row = data as PortfolioRow

          setPortfolio({
            name: row.name ?? '',
            role: row.role ?? '',
            about: row.about ?? '',
            skills: row.skills ?? '',
            project: row.project ?? '',
            github: row.github ?? '',
            linkedin: row.linkedin ?? '',
            email: row.email ?? '',
          })

          setPortfolioId(row.id)

          if (
            row.template === 'minimal' ||
            row.template === 'creative' ||
            row.template === 'dark-pro'
          ) {
            setSelectedTemplate(row.template)
          }

          setSavedMessage('Cloud portfolio loaded.')
        } else {
          try {
            const localDraft = localStorage.getItem(STORAGE_KEY)
            const localTemplate = localStorage.getItem(TEMPLATE_KEY)

            if (localDraft) {
              setPortfolio({
                ...emptyPortfolio,
                ...JSON.parse(localDraft),
              })
            }

            if (
              localTemplate === 'minimal' ||
              localTemplate === 'creative' ||
              localTemplate === 'dark-pro'
            ) {
              setSelectedTemplate(localTemplate)
            }
          } catch {
            console.warn('Could not load the local draft.')
          }

          setSavedMessage('Draft ready. Save it to the cloud.')
        }
      } catch (error) {
        if (!active) return

        setSavedMessage(
          error instanceof Error
            ? `Could not load portfolio: ${error.message}`
            : 'Could not load your portfolio.'
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadPortfolio()

    return () => {
      active = false
    }
  }, [])

  // Keep a local backup of the draft.
  useEffect(() => {
    if (loading) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio))
    } catch {
      console.warn('Could not save the local draft.')
    }
  }, [portfolio, loading])

  useEffect(() => {
    if (loading) return

    try {
      localStorage.setItem(TEMPLATE_KEY, selectedTemplate)
    } catch {
      console.warn('Could not save the selected template.')
    }
  }, [selectedTemplate, loading])

  function updateField(field: keyof PortfolioData, value: string) {
    setPortfolio((previous) => ({
      ...previous,
      [field]: value,
    }))

    setSavedMessage('Unsaved changes')
  }

  // Test whether User B can read User A's portfolio.
  async function testOtherUserDraft() {
    setSecurityTestMessage('Testing read protection...')

    try {
      if (!testPortfolioId.trim()) {
        setSecurityTestMessage('Enter User A’s portfolio ID first.')
        return
      }

      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) throw userError

      if (!userData.user) {
        setSecurityTestMessage('FAIL: No authenticated user found.')
        return
      }

      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name, published')
        .eq('id', testPortfolioId.trim())
        .maybeSingle()

      if (error) throw error

      if (!data) {
        setSecurityTestMessage(
          'PASS: User B cannot read this portfolio through the authenticated client.'
        )
      } else if (data.published) {
        setSecurityTestMessage(
          'INCONCLUSIVE: This portfolio is published and may be publicly readable.'
        )
      } else {
        setSecurityTestMessage(
          'WARNING: User B can read this unpublished portfolio. Check RLS policies.'
        )
      }
    } catch (error) {
      setSecurityTestMessage(
        error instanceof Error
          ? `Test error: ${error.message}`
          : 'Test failed unexpectedly.'
      )
    }
  }

  // Test update protection using only the disposable test portfolio.
  async function testOtherUserUpdate() {
    setSecurityTestMessage('Testing update protection...')

    try {
      const portfolioIdToTest = testPortfolioId.trim()

      if (!portfolioIdToTest) {
        setSecurityTestMessage(
          'Enter User A’s disposable test portfolio ID first.'
        )
        return
      }

      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) throw userError

      if (!userData.user) {
        setSecurityTestMessage(
          'FAIL: No authenticated user found.'
        )
        return
      }

      // Do not SELECT the row first: RLS may hide it from User B.
      // This intentionally uses a marker name, so use only a disposable test row.
      const { data: updatedRows, error: updateError } = await supabase
        .from('portfolios')
        .update({ name: 'SECURITY_TEST_MARKER' })
        .eq('id', portfolioIdToTest)
        .select('id')

      if (updateError) {
        setSecurityTestMessage(
          `Update request returned an error: ${updateError.message}. Check the policy and test setup before concluding.`
        )
        return
      }

      if (!updatedRows || updatedRows.length === 0) {
        setSecurityTestMessage(
          'PASS: No row was updated. This is consistent with RLS blocking User B.'
        )
        return
      }

      setSecurityTestMessage(
        'WARNING: The test row was updated. RLS did not block this request; restore the disposable test portfolio name immediately and review the UPDATE policy.'
      )
    } catch (error) {
      setSecurityTestMessage(
        error instanceof Error
          ? `Test error: ${error.message}`
          : 'Test failed unexpectedly.'
      )
    }
  }

  // Save or update the current user's portfolio.
  async function saveToCloud() {
    if (saving || loading) return

    setSaving(true)
    setSavedMessage('Saving to the cloud...')

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) throw userError

      const user = userData.user

      if (!user) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const payload = {
        user_id: user.id,
        name: portfolio.name.trim() || 'My Portfolio',
        role: portfolio.role,
        about: portfolio.about,
        skills: portfolio.skills,
        project: portfolio.project,
        github: portfolio.github,
        linkedin: portfolio.linkedin,
        email: portfolio.email,
        template: selectedTemplate,
      }

      if (portfolioId) {
        const { data, error } = await supabase
          .from('portfolios')
          .update(payload)
          .eq('id', portfolioId)
          .eq('user_id', user.id)
          .select('id')
          .maybeSingle()

        if (error) throw error

        if (!data) {
          throw new Error(
            'No portfolio was updated. Reload and try again.'
          )
        }
      } else {
        const baseSlug =
          portfolio.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 35) || 'my-portfolio'

        const slug =
          `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`

        const { data, error } = await supabase
          .from('portfolios')
          .insert({
            ...payload,
            slug,
            published: false,
          })
          .select('id')
          .single()

        if (error) throw error

        setPortfolioId(data.id)
      }

      setSavedMessage('Saved securely to Supabase!')
    } catch (error) {
      setSavedMessage(
        error instanceof Error
          ? `Cloud save failed: ${error.message}`
          : 'Cloud save failed. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const skillList = portfolio.skills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)

  return (
    <main className="portfolio-builder">
      <header className="builder-header">
        <a className="logo" href="/">
          Portfolia<span>.</span>
        </a>
        <span className="preview-label">EDITOR + LIVE PREVIEW</span>
      </header>

      <div className="builder-heading">
        <p className="eyebrow">BUILD YOUR PERSONAL BRAND</p>
        <h1>Create your portfolio</h1>
        <p>Your changes appear in the preview as you type.</p>

        <p className="save-status" role="status" aria-live="polite">
          {savedMessage}
        </p>

        <button
          type="button"
          onClick={() => void saveToCloud()}
          disabled={loading || saving}
        >
          {loading
            ? 'Loading...'
            : saving
              ? 'Saving...'
              : 'Save to cloud'}
        </button>
      </div>

      {/* Temporary security-test panel */}
      <section className="editor-panel">
        <h2>Temporary security test</h2>
        <p>
          Sign in as User B and enter the ID of User A’s unpublished
          test portfolio.
        </p>

        <label htmlFor="test-portfolio-id">
          User A portfolio ID
        </label>

        <input
          id="test-portfolio-id"
          value={testPortfolioId}
          onChange={(event) => setTestPortfolioId(event.target.value)}
          placeholder="Paste User A's portfolio ID"
        />

        <button
          type="button"
          onClick={() => void testOtherUserDraft()}
          disabled={!testPortfolioId.trim()}
        >
          Test access as current user
        </button>

        <button
          type="button"
          onClick={() => void testOtherUserUpdate()}
          disabled={!testPortfolioId.trim()}
        >
          Test update protection
        </button>

        <p role="status" aria-live="polite">
          {securityTestMessage}
        </p>
      </section>

      <div className="builder-layout">
        <section className="editor-panel">
          <h2>Your information</h2>

          <div className="template-picker">
            <h3>Choose your template</h3>

            <div className="template-options">
              <button
                type="button"
                className={`template-option ${selectedTemplate === 'minimal' ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTemplate('minimal')
                  setSavedMessage('Unsaved changes')
                }}
              >
                <span className="template-swatch minimal-swatch" />
                Minimal
              </button>

              <button
                type="button"
                className={`template-option ${selectedTemplate === 'dark-pro' ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTemplate('dark-pro')
                  setSavedMessage('Unsaved changes')
                }}
              >
                <span className="template-swatch dark-swatch" />
                Dark Pro
              </button>

              <button
                type="button"
                className={`template-option ${selectedTemplate === 'creative' ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTemplate('creative')
                  setSavedMessage('Unsaved changes')
                }}
              >
                <span className="template-swatch creative-swatch" />
                Creative
              </button>
            </div>
          </div>

          <label htmlFor="full-name">Full name</label>
          <input
            id="full-name"
            value={portfolio.name}
            onChange={(event) => updateField('name', event.target.value)}
            placeholder="e.g. Priya Sharma"
          />

          <label htmlFor="role">Professional title</label>
          <input
            id="role"
            value={portfolio.role}
            onChange={(event) => updateField('role', event.target.value)}
            placeholder="e.g. Student & Web Developer"
          />

          <label htmlFor="about">About me</label>
          <textarea
            id="about"
            value={portfolio.about}
            onChange={(event) => updateField('about', event.target.value)}
            placeholder="Tell people about yourself..."
            rows={5}
          />

          <label htmlFor="skills">Skills</label>
          <input
            id="skills"
            value={portfolio.skills}
            onChange={(event) => updateField('skills', event.target.value)}
            placeholder="Python, HTML, CSS, React"
          />
          <p className="field-hint">Separate each skill with a comma.</p>

          <label htmlFor="project">Featured project</label>
          <textarea
            id="project"
            value={portfolio.project}
            onChange={(event) => updateField('project', event.target.value)}
            placeholder="What did you build? What does it do?"
            rows={4}
          />

          <h2>Contact & social links</h2>

          <label htmlFor="github">GitHub profile URL</label>
          <input
            id="github"
            type="url"
            value={portfolio.github}
            onChange={(event) => updateField('github', event.target.value)}
            placeholder="https://github.com/yourusername"
          />

          <label htmlFor="linkedin">LinkedIn profile URL</label>
          <input
            id="linkedin"
            type="url"
            value={portfolio.linkedin}
            onChange={(event) => updateField('linkedin', event.target.value)}
            placeholder="https://www.linkedin.com/in/yourusername"
          />

          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={portfolio.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="you@example.com"
          />
        </section>

        <section className={`preview-panel theme-${selectedTemplate}`}>
          <div className="preview-topbar">
            <span>LIVE PREVIEW</span>
            <span className="live-indicator">● Live</span>
          </div>

          <div className="portfolio-card">
            <div className="portfolio-banner">
              <div className="profile-avatar">
                {portfolio.name.trim()
                  ? portfolio.name.trim().charAt(0).toUpperCase()
                  : '?'}
              </div>
            </div>

            <div className="portfolio-content">
              <p className="portfolio-kicker">HELLO, I'M</p>

              <h2 className="portfolio-name">
                {portfolio.name.trim() || 'Your Name'}
              </h2>

              <p className="portfolio-role">
                {portfolio.role.trim() || 'Your professional title'}
              </p>

              <div className="portfolio-section">
                <h3>About me</h3>
                <p className="portfolio-text">
                  {portfolio.about.trim() ||
                    'Your introduction will appear here. Tell visitors who you are and what you love doing.'}
                </p>
              </div>

              <div className="portfolio-section">
                <h3>My skills</h3>
                {skillList.length > 0 ? (
                  <div className="skill-list">
                    {skillList.map((skill, index) => (
                      <span className="skill-chip" key={`${skill}-${index}`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="portfolio-text">
                    Your skills will appear here.
                  </p>
                )}
              </div>

              <div className="portfolio-section">
                <h3>Featured project</h3>
                <div className="project-preview">
                  <div className="project-symbol">✦</div>
                  <h4>
                    {portfolio.project.trim()
                      ? 'My featured project'
                      : 'Your project'}
                  </h4>
                  <p className="portfolio-text">
                    {portfolio.project.trim() ||
                      'Add a description of a project you have worked on.'}
                  </p>
                </div>
              </div>

              <div className="portfolio-section">
                <h3>Let's connect</h3>
                <div className="contact-links">
                  {portfolio.github.trim() && (
                    <a
                      href={portfolio.github.trim()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub ↗
                    </a>
                  )}

                  {portfolio.linkedin.trim() && (
                    <a
                      href={portfolio.linkedin.trim()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn ↗
                    </a>
                  )}

                  {portfolio.email.trim() && (
                    <a href={`mailto:${portfolio.email.trim()}`}>
                      Email me ↗
                    </a>
                  )}
                </div>
              </div>

              <p className="portfolio-footer">Designed with Portfolia.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default PortfolioEditor
