/**
 * AuthApp - Auth gate around the existing App.jsx.
 *
 * Responsibilities:
 *   - Show a centered Login/Signup modal when there's no session
 *   - When signed in, render the existing <App /> + a top header
 *     with email + sign-out button
 *   - Keep App.jsx untouched
 *
 */

import { useState } from "react";
import { useAuth }   from "./lib/auth.js";
import App           from "./App.jsx";

// =================================================================
// Styles - inlined to match the dark theme already in App.jsx.
// Kept tiny so we don't fight the existing CSS.
// =================================================================
const STYLE = `
  .auth-overlay {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .auth-card {
    background: #0f1820;
    border: 1px solid #2dd4a4;
    border-radius: 16px;
    padding: 36px 32px;
    width: 100%; max-width: 380px;
    box-shadow: 0 20px 60px rgba(45, 212, 164, 0.15);
  }
  .auth-card h2 {
    color: #2dd4a4; margin: 0 0 4px;
    font-size: 24px; letter-spacing: 0.5px;
  }
  .auth-card p { color: #94a3b8; font-size: 14px; margin: 0 0 20px; }
  .auth-card label {
    display: block; color: #cbd5e1; font-size: 12px;
    text-transform: uppercase; letter-spacing: 1px;
    margin: 14px 0 6px;
  }
  .auth-card input {
    width: 100%; box-sizing: border-box;
    background: #0a1218; color: #fff;
    border: 1px solid #1e293b; border-radius: 8px;
    padding: 11px 13px; font-size: 15px;
    outline: none;
  }
  .auth-card input:focus { border-color: #2dd4a4; }
  .auth-card button.primary {
    width: 100%; margin-top: 22px;
    background: #2dd4a4; color: #0a1218;
    border: none; border-radius: 8px;
    padding: 13px; font-size: 15px; font-weight: 600;
    cursor: pointer; letter-spacing: 0.5px;
  }
  .auth-card button.primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-card .toggle {
    margin-top: 14px; text-align: center;
    color: #94a3b8; font-size: 13px;
  }
  .auth-card .toggle a {
    color: #2dd4a4; cursor: pointer; text-decoration: none; font-weight: 600;
  }
  .auth-card .err {
    margin-top: 12px; padding: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: 6px; color: #fca5a5;
    font-size: 13px;
  }

  .auth-header {
    position: fixed; top: 0; right: 0;
    padding: 12px 16px; z-index: 9999;
    display: flex; gap: 12px; align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px; color: #94a3b8;
    background: rgba(15, 24, 32, 0.85);
    backdrop-filter: blur(8px);
    border-bottom-left-radius: 12px;
    border: 1px solid rgba(45, 212, 164, 0.2);
    border-top: none; border-right: none;
  }
  .auth-header button {
    background: transparent; color: #2dd4a4;
    border: 1px solid #2dd4a4; border-radius: 6px;
    padding: 5px 12px; font-size: 12px; cursor: pointer;
    letter-spacing: 0.5px;
  }
`;

// =================================================================
// AuthModal - email/password sign-in or sign-up
// =================================================================
function AuthModal({ onAuthed }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]       = useState("signin");  // 'signin' | 'signup'
  const [email, setEmail]     = useState("");
  const [password, setPwd]    = useState("");
  const [err, setErr]         = useState(null);
  const [busy, setBusy]       = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn({ email, password });
      } else {
        const { user } = await signUp({ email, password });
        if (!user) {
          setErr("Check your inbox to confirm the email, then sign in.");
          setBusy(false);
          return;
        }
      }
      onAuthed?.();
    } catch (e) {
      setErr(e.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-overlay">
      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === "signin" ? "Welcome back" : "Create account"}</h2>
        <p>{mode === "signin"
          ? "Sign in to continue to your dashboard."
          : "Sign up to get your weekly AI move."}</p>

        <label htmlFor="email">Email</label>
        <input
          id="email" type="email" required autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)}
        />

        <label htmlFor="pwd">Password</label>
        <input
          id="pwd" type="password" required minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password} onChange={e => setPwd(e.target.value)}
        />

        {err && <div className="err">{err}</div>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? "..." : (mode === "signin" ? "Sign in" : "Sign up")}
        </button>

        <div className="toggle">
          {mode === "signin"
            ? <>No account? <a onClick={() => { setMode("signup"); setErr(null); }}>Sign up</a></>
            : <>Have an account? <a onClick={() => { setMode("signin"); setErr(null); }}>Sign in</a></>}
        </div>
      </form>
    </div>
  );
}

// =================================================================
// AuthHeader - tiny pill in top-right when signed in
// =================================================================
function AuthHeader({ user, onSignOut }) {
  return (
    <div className="auth-header">
      <span>{user.email}</span>
      <button onClick={onSignOut}>Sign out</button>
    </div>
  );
}

// =================================================================
// AuthApp - top-level wrapper
// =================================================================
export default function AuthApp() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <>
        <style>{STYLE}</style>
        <div className="auth-overlay"><div className="auth-card"><p>Loading...</p></div></div>
      </>
    );
  }

  return (
    <>
      <style>{STYLE}</style>
      <App />
      {!user && <AuthModal />}
      {user  && <AuthHeader user={user} onSignOut={signOut} />}
    </>
  );
}
