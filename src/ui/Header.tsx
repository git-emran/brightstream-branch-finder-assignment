import { useEffect, useState } from 'react'

export function Header() {
  const [isOnHero, setIsOnHero] = useState(true)

  useEffect(() => {
    const hero = document.querySelector('.bs-hero--branchFinder')
    if (!hero) return
    if (!('IntersectionObserver' in window)) return

    const io = new IntersectionObserver(
      ([entry]) => setIsOnHero(entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: '-88px 0px 0px 0px' },
    )

    io.observe(hero)
    return () => io.disconnect()
  }, [])

  return (
    <header className={isOnHero ? 'bs-header bs-header--onHero' : 'bs-header'}>
      <nav className="bs-nav" aria-label="Primary">
        <div className="bs-container bs-nav__content">
          <a className="bs-logo" href="#main">
            Brightstream
            <span className="bs-logo__dot" aria-hidden="true">
              .
            </span>
          </a>

          <div className="bs-nav__links" aria-label="Site">
            <a className="bs-nav__link" href="#">
              Personal
            </a>
            <a className="bs-nav__link" href="#">
              Business
            </a>
            <a className="bs-nav__link" href="#">
              Wealth
            </a>
            <a className="bs-nav__link" href="#">
              About
            </a>
            <a className="bs-nav__link" href="#">
              Articles
            </a>
            <a className="bs-nav__link bs-nav__link--active" href="#main">
              Branches
            </a>
          </div>

          <div className="bs-nav__actions">
            <a className="bs-btn bs-btn--cta" href="#main">
              Get Started
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}
