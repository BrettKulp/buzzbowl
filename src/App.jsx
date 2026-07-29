// App.jsx
import { useState, useRef } from 'react'
import logo from './assets/logo.webp'
import discDye from './assets/discdye.webp'
import running from './assets/running.png'
import EFPlayCall from './assets/EFPlayCall.webp'
import { initializeApp } from "firebase/app";
import { collection, addDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { PhaserGame } from './game/PhaserGame';

import './App.css'

function App() {

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSumbitted] = useState(false);

  const phaserRef = useRef();

  const addEmail = async (e) => {
    e.preventDefault();

    try {
      if (email != '') {
        await addDoc(collection(db, 'emails'), {
          email: email,
          Timestamp: new Date()
        });

        setIsSumbitted(true);
        setEmail('');


      } else {
       // console.log('no email')
      }
    } catch (error) {
      console.error('Error adding email', error)
    }
  }

  return (
    <div className="container">
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

      <main className="main-content">
      <p className="tagline">Work in progress Football Game</p>
      <p className="tagline-desc">You can currently play the game in its in progress state which may result in things not working correctly. You can move both the defense and offense</p>
      <br/>
      <p className="tagline-desc mt-5">The orange player is the ball carrier. To pass tap or click a skill postiton player 
      with a red dot when the play type is set to pass. You can also pause the play then complete the pass while the paly is paused. All passes have a 70% chance of completion
      You can click on a player and drag the red circle to rotate thier position before the play or while the play is paused. Tap or click a player then use the yellow arrows to rotate the player&apos;s direction before a play or while the play is paused.
      After a touchdown the game will reset</p>
    <div className="game-section" >
      <PhaserGame ref={phaserRef} />
    </div>

          

        {!isSubmitted ? (
          <div className="email-signup">
            <p>Want to be emailed about testing opportunities and launch?</p>
            <div className="input-group">
              <form onSubmit={addEmail}>
                <input
                  type="email"
                  placeholder="Enter Email"
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button style={{ marginTop: "0.5rem",  color: "white" }}>Join Email List</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="submitted-message" >
            <span style={{ display: 'block', fontSize: '2rem', marginBottom: '1rem' }}>
              Thank you!
            </span>
            you will receive an email when there are testing opportunities and on Launch!
          </div>
        )}

        <div className="contact">
          <a href="https://discord.gg/xen4wNYMGt" className="contact-link">
            Join the Discord
          </a>
          <p></p>
          <a href="mailto:topcitysoftware@gmail.com" className="contact-link">
            Contact Me
          </a>
          <p>BK Software LLC</p>
        </div>

        <div className="contributing">
          <p>Interested in contributing? Check out the project on GitHub!</p>
          <a href="https://github.com/BrettKulp/buzzbowl" target="_blank" className="contact-link">
            GitHub Repository
          </a>
        </div>

        <section className="other-work">
          <h2>My Other Work & Partners</h2>
          <div className="projects">
            <div className="project">
              <a href="https://discdyetracker.com/" target="_blank">
                <img src={discDye} className="logo discDye-logo" alt="Dyed Disc Golf Disc Logo" />
              </a>
              <a href="https://discdyetracker.com/" target="_blank" className="project-link">
                Disc Dye Tracker
              </a>
            </div>
            
             <div className="project">
              <a href="https://runningcamps.org/" target="_blank">
                <img src={running} className="logo bash-logo" alt="R logo" />
              </a>
              <a href="https://runningcamps.org/" target="_blank" className="project-link">
                Runningcamps.org The best place to find the perfect running camp for you
              </a>
            </div>

            <div className="project">
              <a href="https://ef-solitaire-play-call-sim.web.app" target="_blank">
                <img src={EFPlayCall} className="logo ef-logo" alt="Football Player Figure" />
              </a>
              <a href="https://ef-solitaire-play-call-sim.web.app" target="_blank" className="project-link">
                Electric Football Play Call<br />Simulator
              </a>
            </div>

           
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
