// Header.jsx
import logo from '../assets/logo.webp'

function Header() {
  return (
    <header className="site-header">
      <a target="_blank">
        <img src={logo} className="logo" alt="Neon Football Player Running" />
      </a>
      <h1>Buzz Bowl</h1>
      <a target="_blank">
        <img
          src={logo}
          className="logo logo-mirrored"
          alt="Neon Football Player Running"
        />
      </a>
    </header>
  )
}

export default Header
