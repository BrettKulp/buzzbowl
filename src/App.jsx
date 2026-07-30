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
        <p className="tagline">Work in progress Football Game</p>
        <p className="tagline-desc">You can currently play the game in its in progress state which may result in things not working correctly. You can move both the defense and offense</p>
        <br/>
        <p className="tagline-desc mt-5">The orange player is the ball carrier. To pass tap or click a skill postiton player
        with a red dot when the play type is set to pass. You can also pause the play then complete the pass while the paly is paused. All passes have a 70% chance of completion
        You can click on a player and drag the red circle to rotate thier position before the play or while the play is paused. Tap or click a player then use the yellow arrows to rotate the player&apos;s direction before a play or while the play is paused.
        After a touchdown the game will reset</p>
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
