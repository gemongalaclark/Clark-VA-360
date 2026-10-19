import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Reload when a newer deploy exists, so open/cached tabs never stay on an old UI.
if (import.meta.env.PROD) {
  const entryOf = (html) => html.match(/\/assets\/index-[\w-]+\.js/)?.[0]
  const current = document.querySelector('script[type="module"][src*="/assets/index-"]')
    ?.getAttribute('src')
  let checking = false
  const checkForUpdate = async () => {
    if (checking || !current) return
    checking = true
    try {
      const res = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })
      const latest = entryOf(await res.text())
      if (latest && latest !== current) {
        // at most one auto-reload per target version, to avoid loops on a lagging edge
        if (sessionStorage.getItem('reloadedTo') === latest) return
        sessionStorage.setItem('reloadedTo', latest)
        window.location.reload()
      }
    } catch {
      /* offline – try again next time */
    } finally {
      checking = false
    }
  }
  checkForUpdate()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) checkForUpdate() // back/forward cache restore
  })
  window.addEventListener('vite:preloadError', () => window.location.reload())
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
