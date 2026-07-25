import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './styles/index.css'

const reportRuntimeError = (reason: unknown) => {
  if (!import.meta.env.DEV) return
  const error = reason instanceof Error ? reason : new Error(String(reason))
  void fetch('/__bean_runtime_error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: error.message, stack: error.stack }),
  }).catch(() => undefined)
}

class BeanErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportRuntimeError(new Error(`${error.message}\n${info.componentStack ?? ''}`))
  }

  private returnHome = () => {
    try {
      const storageKey = 'bean-figma-prototype-v1'
      const saved = window.localStorage.getItem(storageKey)
      const state = saved ? JSON.parse(saved) : {}
      window.localStorage.setItem(storageKey, JSON.stringify({ ...state, screen: 'home' }))
    } catch {
      // Reloading still gives Bean a chance to recover from non-storage errors.
    }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#18192d', fontFamily: 'Inter, sans-serif' }}>
      <section style={{ width: 'min(390px, 100%)', padding: 28, borderRadius: 28, background: '#fff6dd', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 10px', color: '#3786ad', fontSize: 24 }}>Bean needs a moment</h1>
        <p style={{ margin: '0 0 18px', color: '#52656b', lineHeight: 1.45 }}>A saved screen could not be restored. Your observations are still saved.</p>
        <button onClick={this.returnHome} style={{ border: 0, borderRadius: 999, padding: '12px 22px', background: '#fcb900', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Return home</button>
      </section>
    </main>
  }
}

window.addEventListener('error', (event) => reportRuntimeError(event.error ?? event.message))
window.addEventListener('unhandledrejection', (event) => reportRuntimeError(event.reason))

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Bean could not find its application root.')

try {
  createRoot(rootElement).render(<BeanErrorBoundary><App /></BeanErrorBoundary>)
} catch (reason) {
  reportRuntimeError(reason)
  throw reason
}
