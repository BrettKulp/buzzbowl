// OtherWork.jsx
import discDye from '../assets/discdye.webp'
import running from '../assets/running.png'
import EFPlayCall from '../assets/EFPlayCall.webp'

function OtherWork() {
  return (
    <section className="other-work">
      <h2>Partners</h2>
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
  )
}

export default OtherWork
