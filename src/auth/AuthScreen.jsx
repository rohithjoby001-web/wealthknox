import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { Icon } from '../icons/index.jsx';

export default function AuthScreen() {
  const { signUp, signIn, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const mail = email.trim();
    if (!mail || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    const { error: err } = mode === 'signup' ? await signUp(mail, password) : await signIn(mail, password);
    setBusy(false);
    if (err) setError(err);
  };

  const forgotPassword = async () => {
    const mail = email.trim();
    if (!mail) { setError('Enter your email above first.'); return; }
    setError('');
    setBusy(true);
    const { error: err } = await resetPassword(mail);
    setBusy(false);
    if (err) setError(err);
    else setNotice('Check your inbox for a reset link.');
  };

  return (
    <div className="authscreen">
      <div className="authscreen-card">
        <h1 className="authscreen-title">WealthKnox</h1>
        <p className="authscreen-sub">
          {mode === 'signup' ? 'Create an account to sync your data across devices.' : 'Sign in to pick up where you left off.'}
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field" style={{ marginBottom: 6 }}>
            <label>Password</label>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === 'signin' ? (
            <button type="button" className="authscreen-forgot" onClick={forgotPassword}>Forgot password?</button>
          ) : null}

          {error ? <p className="authscreen-msg warn">{error}</p> : null}
          {notice ? <p className="authscreen-msg">{notice}</p> : null}

          <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 14 }}>
            <Icon name={mode === 'signup' ? 'plus' : 'check'} size={18} stroke={2.4} />
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className="authscreen-switch"
          onClick={() => { setMode((m) => (m === 'signup' ? 'signin' : 'signup')); setError(''); setNotice(''); }}
        >
          {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
