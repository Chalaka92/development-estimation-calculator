import './App.css'
import { resolveAppMode } from './app/appMode'
import { ReactCalculatorPreview } from './features/calculator/ReactCalculatorPreview'

function App() {
  if (resolveAppMode(globalThis.location.search) !== 'legacy') {
    return <ReactCalculatorPreview />
  }

  const legacyCalculatorUrl = `${import.meta.env.BASE_URL}legacy/calculator-v16.html`

  return (
    <main className="app-shell app-shell--legacy">
      <section
        className="legacy-transition-notice"
        aria-labelledby="legacy-transition-title"
      >
        <div>
          <p className="legacy-transition-notice__eyebrow">
            Temporary compatibility mode
          </p>
          <h1 id="legacy-transition-title">Legacy v16 calculator</h1>
          <p>
            Use this fallback only to review or recover older v16 estimates.
            Save changes here, then return to the React calculator; newer saved
            v16 data is migrated automatically without deleting the legacy copy.
          </p>
        </div>
        <a className="legacy-return-link" href="./">
          Return to React calculator
        </a>
      </section>
      <iframe
        className="legacy-calculator"
        src={legacyCalculatorUrl}
        title="Development Estimation Calculator"
      />
    </main>
  )
}

export default App
