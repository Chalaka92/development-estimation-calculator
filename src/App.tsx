import './App.css'
import { resolveAppMode } from './app/appMode'
import { ReactCalculatorPreview } from './features/calculator/ReactCalculatorPreview'

function App() {
  if (resolveAppMode(globalThis.location.search) !== 'legacy') {
    return <ReactCalculatorPreview />
  }

  const legacyCalculatorUrl = `${import.meta.env.BASE_URL}legacy/calculator-v16.html`

  return (
    <main className="app-shell">
      <h1 className="visually-hidden">Development Estimation Calculator</h1>
      <a className="legacy-return-link" href="./">
        Return to React calculator
      </a>
      <iframe
        className="legacy-calculator"
        src={legacyCalculatorUrl}
        title="Development Estimation Calculator"
      />
    </main>
  )
}

export default App
