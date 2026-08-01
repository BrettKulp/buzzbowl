// EmailSignup.jsx
import { useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'

function EmailSignup() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const addEmail = async (e) => {
    e.preventDefault()

    if (email === '') return

    try {
      await addDoc(collection(db, 'emails'), {
        email: email,
        Timestamp: new Date()
      })

      setIsSubmitted(true)
      setEmail('')
    } catch (error) {
      console.error('Error adding email', error)
    }
  }

  if (isSubmitted) {
    return (
      <div className="submitted-message">
        <span style={{ display: 'block', fontSize: '2rem', marginBottom: '1rem' }}>
          Thank you!
        </span>
        you will receive an email when there are testing opportunities and on Launch!
      </div>
    )
  }

  return (
    <div className="email-signup">
      <p>Want to be emailed about testing opportunities and launch?</p>
      <div className="input-group">
        <form onSubmit={addEmail}>
          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button style={{ marginTop: '0.5rem', color: 'white' }}>Join Email List</button>
        </form>
      </div>
    </div>
  )
}

export default EmailSignup
