// App.jsx
import { useRef } from 'react'
import { PhaserGame } from './game/PhaserGame'
import Header from './components/Header'
import Footer from './components/Footer'
import EmailSignup from './components/EmailSignup'
import OtherWork from './components/OtherWork'

import './App.css'

const isBuzzBowlDomain = ['buzzbowl.org', 'www.buzzbowl.org'].includes(window.location.hostname)

function App() {
  const phaserRef = useRef();

  return (
    <div className="container">
      <Header />

      <main className="main-content">
        <p className="site-notice">Beta build — move both offense and defense. Expect some rough edges.</p>
        <details className="how-to-play">
          <summary>How to play</summary>
          <p>
            The orange player is the ball carrier. To pass, tap or click a skill position player
            with a red dot when the play type is set to pass. You can also pause the play then
            complete the pass while play is paused. All passes have a 70% chance of completion.
            Click a player and drag the red circle to rotate their position before the play or
            while paused. Tap a player then use the yellow arrows to rotate the player&apos;s
            direction before a play or while paused. After a touchdown, the game resets.
          </p>
        </details>
        <div className="game-section">
          <PhaserGame ref={phaserRef} />
        </div>

        <EmailSignup />

        <Footer />

        {isBuzzBowlDomain && <OtherWork />}
      </main>
    </div>
  )
}

export default App
