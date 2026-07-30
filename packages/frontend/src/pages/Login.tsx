import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.js";

export function Login() {
  const login = useAuthStore((s) => s.login);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ emailOrUsername, password });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Bei Nythera anmelden</h1>
        <input
          placeholder="E-Mail oder Benutzername"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          autoFocus
        />
        <input placeholder="Passwort" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          Anmelden
        </button>
        <span className="switch-link" onClick={() => navigate("/register")}>
          Noch kein Konto? Registrieren
        </span>
      </form>
    </div>
  );
}
