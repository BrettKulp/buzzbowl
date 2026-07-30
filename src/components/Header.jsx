// Header.jsx
import logo from '../assets/logo.webp'

function Header() {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <img src={logo} className="site-header__badge" alt="Neon Football Player Running" />
        <div className="site-header__wordmark">
          <h1>Buzz Bowl</h1>
          <p className="site-header__tagline">Work-in-progress football game</p>
        </div>
      </div>
    </header>
  )
}

export default Header
