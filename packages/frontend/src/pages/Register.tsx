import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.js";

export function Register() {
  const register = useAuthStore((s) => s.register);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ username, displayName, email, password });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Nythera-Konto erstellen</h1>
        <input placeholder="Benutzername" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input placeholder="Anzeigename" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input placeholder="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Passwort (min. 8 Zeichen)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="auth-error">{error}</div>}
        <button type="submit" disabled={submitting}>
          Registrieren
        </button>
        <span className="switch-link" onClick={() => navigate("/login")}>
          Schon ein Konto? Anmelden
        </span>
      </form>
    </div>
  );
}
