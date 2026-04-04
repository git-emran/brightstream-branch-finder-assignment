export function Header() {
  return (
    <header className="bs-header">
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
            <a className="bs-nav__link bs-nav__link--active" href="#main">
              Branch Finder
            </a>
            <a className="bs-nav__link" href="#">
              Resources
            </a>
          </div>

          <div className="bs-nav__actions">
            <a className="bs-btn bs-btn--secondary" href="#">
              Log in
            </a>
            <a className="bs-btn bs-btn--primary" href="#">
              Open an account
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}

