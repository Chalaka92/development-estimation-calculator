import './App.css'

function App() {
  const legacyCalculatorUrl = `${import.meta.env.BASE_URL}legacy/calculator-v16.html`

  return (
    <main className="app-shell">
      <h1 className="visually-hidden">Development Estimation Calculator</h1>
      <iframe
        className="legacy-calculator"
        src={legacyCalculatorUrl}
        title="Development Estimation Calculator"
      />
    </main>
  )
}

export default App
