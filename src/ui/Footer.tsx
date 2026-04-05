export function Footer() {
  return (
    <footer className="bs-footer">
      <div className="bs-container bs-footer__content">
        <div className="bs-footer__brand">
          <div className="bs-footer__logo">Brightstream</div>
          <p className="bs-footer__tagline">Banking reimagined.</p>
        </div>

        <div className="bs-footer__links">
          <a className="bs-footer__link" href="#">
            Contact
          </a>
          <a className="bs-footer__link" href="#">
            Accessibility
          </a>
          <a className="bs-footer__link" href="#">
            Privacy
          </a>
        </div>

        <div className="bs-footer__fineprint">
          © {new Date().getFullYear()} Brightstream Bank by Emran H. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

