// Header.jsx
import logo from '../assets/logo.webp'

function Header() {
  return (
    <header className="site-header">
      <img src={logo} className="site-header__logo" alt="Neon Football Player Running" />
      <div className="site-header__brand">
        <h1>Buzz Bowl</h1>
        <p className="site-header__tagline">Work-in-progress football game</p>
      </div>
      <img src={logo} className="site-header__logo site-header__logo--mirrored" alt="Neon Football Player Running" />
    </header>
  )
}

export default Header
