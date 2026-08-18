import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange,
  requestPasswordRecovery,
  signup,
  updateUser,
  type User,
} from "@netlify/identity";
import { ArrowRight, CheckCircle2, Cloud, LoaderCircle } from "lucide-react";
import { Ring } from "./Ring";

interface AuthGateProps {
  children: (user: User, signOut: () => Promise<void>) => ReactNode;
}

type AuthMode = "login" | "signup";

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
}

export function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthChange((_event, nextUser) => {
      if (active) setUser(nextUser);
    });

    void (async () => {
      try {
        const callback = await handleAuthCallback();
        const currentUser = callback?.user ?? await getUser();
        if (callback?.type === "recovery" && active) setRecovering(true);
        if (active) setUser(currentUser ?? null);
      } catch (authError) {
        if (active) setError(messageFromError(authError));
      } finally {
        if (active) setChecking(false);
      }
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "login") {
        const nextUser = await login(email.trim(), password);
        setUser(nextUser);
      } else {
        await signup(email.trim(), password);
        const nextUser = await getUser();
        if (nextUser) {
          setUser(nextUser);
        } else {
          setPassword("");
          setNotice("Check your email to confirm your account, then come back and sign in.");
          setMode("login");
        }
      }
    } catch (authError) {
      setError(messageFromError(authError));
    } finally {
      setWorking(false);
    }
  };

  const recoverPassword = async () => {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      await requestPasswordRecovery(email.trim());
      setNotice("Password recovery instructions are on their way to your email.");
    } catch (authError) {
      setError(messageFromError(authError));
    } finally {
      setWorking(false);
    }
  };

  const signOut = async () => {
    await logout();
    setUser(null);
  };

  const setRecoveredPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      await updateUser({ password });
      setPassword("");
      setRecovering(false);
    } catch (authError) {
      setError(messageFromError(authError));
    } finally {
      setWorking(false);
    }
  };

  if (checking) {
    return <div className="loading-screen"><span className="loading-ring" /><p>Connecting your growth log…</p></div>;
  }

  if (user && recovering) {
    return (
      <main className="auth-reset-page">
        <section className="auth-card">
          <span className="eyebrow">Account recovery</span>
          <h2>Choose a new password</h2>
          <p>Use at least eight characters. You will stay signed in after the password is updated.</p>
          <form className="auth-form" onSubmit={setRecoveredPassword}>
            <label>
              <span>New password</span>
              <input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus />
            </label>
            {error && <div className="auth-message error" role="alert">{error}</div>}
            <button className="primary-button auth-submit" disabled={working}>
              {working ? <LoaderCircle className="auth-spinner" size={17} /> : <ArrowRight size={17} />}
              {working ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (user) return <>{children(user, signOut)}</>;

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="auth-brand">
          <Ring percent={72} size={42} strokeWidth={5} color="var(--moss)" trackColor="var(--line)" />
          <span><strong>Rings</strong><small>a growth log</small></span>
        </div>
        <div>
          <span className="eyebrow">Your progress, everywhere</span>
          <h1>Build routines that stay with you.</h1>
          <p>Your goals, roadmap phases, workout history, and status changes are now securely synced to your account.</p>
        </div>
        <ul className="auth-benefits">
          <li><Cloud size={18} /><span><strong>Cloud sync</strong><small>Open the same data from another browser or device.</small></span></li>
          <li><CheckCircle2 size={18} /><span><strong>Automatic migration</strong><small>Your existing browser data is uploaded after your first sign-in.</small></span></li>
        </ul>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">{mode === "login" ? "Welcome back" : "Create your account"}</span>
          <h2>{mode === "login" ? "Sign in to Rings" : "Start syncing your progress"}</h2>
          <p>{mode === "login" ? "Continue with your saved roadmap and routines." : "The free account keeps each user's data separate."}</p>

          <form className="auth-form" onSubmit={submit}>
            <label>
              <span>Email address</span>
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              <span>Password</span>
              <input type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {error && <div className="auth-message error" role="alert">{error}</div>}
            {notice && <div className="auth-message success" role="status">{notice}</div>}
            <button className="primary-button auth-submit" disabled={working}>
              {working ? <LoaderCircle className="auth-spinner" size={17} /> : <ArrowRight size={17} />}
              {working ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "login" && <button className="text-button auth-recovery" type="button" disabled={working} onClick={recoverPassword}>Forgot password?</button>}
          <div className="auth-switch">
            <span>{mode === "login" ? "New to Rings?" : "Already have an account?"}</span>
            <button className="text-button" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setNotice(null); }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
