import { BranchFinderPage } from './pages/BranchFinderPage'
import { Footer } from './ui/Footer'
import { Header } from './ui/Header'

function App() {
  return (
    <div className="bs-app">
      <Header />
      <main id="main" className="bs-main" tabIndex={-1}>
        <BranchFinderPage />
      </main>
      <Footer />
    </div>
  )
}

export default App
