import { CURRENT_TERMS_VERSION } from "@nythera/shared";
import { useNavigate } from "react-router-dom";

export function TermsOfService() {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <button className="icon-button" onClick={() => navigate(-1)}>
        ← Zurück
      </button>
      <h1>Allgemeine Geschäftsbedingungen</h1>
      <p className="legal-placeholder-notice">
        <strong>Platzhalter.</strong> Dies ist kein rechtsgültiger Text. Der Betreiber dieser Nythera-Instanz muss diesen Text vor dem
        Produktivbetrieb durch echte, geprüfte AGB ersetzen.
      </p>
      <p>Version: {CURRENT_TERMS_VERSION}</p>
    </div>
  );
}
