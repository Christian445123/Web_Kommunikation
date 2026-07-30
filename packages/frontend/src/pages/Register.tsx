import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@nythera/shared";
import { useAuthStore } from "../store/auth.js";

export function Register() {
  const register = useAuthStore((s) => s.register);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedPolicies) {
      setError("Bitte akzeptiere die Datenschutzerklärung und AGB.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        username,
        displayName,
        email,
        password,
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
        acceptedPrivacyVersion: CURRENT_PRIVACY_VERSION,
      });
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
        <label className="consent-checkbox">
          <input type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} />
          <span>
            Ich akzeptiere die{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Datenschutzerklärung
            </a>{" "}
            und{" "}
            <a href="/terms" target="_blank" rel="noreferrer">
              AGB
            </a>
            .
          </span>
        </label>
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
