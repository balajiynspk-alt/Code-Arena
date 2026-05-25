import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import './Login.css';

const googleProvider = new GoogleAuthProvider();

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/problems');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/problems');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-login-page">
      {/* Scanline overlay */}
      <div className="cp-scanlines" aria-hidden="true" />

      <div className="cp-login-card">
        {/* Corner decorations */}
        <span className="cp-corner cp-corner-tl" />
        <span className="cp-corner cp-corner-tr" />
        <span className="cp-corner cp-corner-bl" />
        <span className="cp-corner cp-corner-br" />

        {/* Header */}
        <div className="cp-login-header">
          <h1 className="cp-login-title">
            <span className="cp-t-pink">CODE</span><span className="cp-t-green">ARENA</span>
          </h1>
          <p className="cp-login-sub">
            {mode === 'login' ? '// AUTHENTICATE TO CONTINUE' : '// CREATE NEW OPERATOR ACCOUNT'}
          </p>
        </div>

        {/* Google */}
        <button
          className="cp-google-btn"
          onClick={handleGoogle}
          disabled={loading}
          id="google-login-btn"
        >
          {loading ? (
            <span className="cp-loading-text">INITIALIZING SESSION...</span>
          ) : (
            <>
              <svg className="cp-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              CONTINUE WITH GOOGLE
            </>
          )}
        </button>

        <div className="cp-divider">
          <span className="cp-divider-line" />
          <span className="cp-divider-text">OR</span>
          <span className="cp-divider-line" />
        </div>

        {/* Email form */}
        <form className="cp-login-form" onSubmit={handleEmail}>
          <div className="cp-field">
            <label className="cp-label">EMAIL</label>
            <input
              id="email-input"
              className="cp-input"
              type="email"
              placeholder="operator@domain.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="cp-field">
            <label className="cp-label">PASSWORD</label>
            <input
              id="password-input"
              className="cp-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <p className="cp-error">{error}</p>}

          <button
            id="email-submit-btn"
            className="cp-submit-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="cp-loading-text">INITIALIZING SESSION...</span>
            ) : (
              mode === 'login' ? 'ACCESS SYSTEM' : 'REGISTER OPERATOR'
            )}
          </button>
        </form>

        {/* Mode toggle */}
        <p className="cp-toggle">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button className="cp-toggle-btn" onClick={() => { setMode('register'); setError(''); }}>
                REGISTER
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button className="cp-toggle-btn" onClick={() => { setMode('login'); setError(''); }}>
                LOGIN
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
