import { CURRENT_PRIVACY_VERSION } from "@nythera/shared";
import { useNavigate } from "react-router-dom";

export function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <button className="icon-button" onClick={() => navigate(-1)}>
        ← Zurück
      </button>
      <h1>Datenschutzerklärung</h1>
      <p className="legal-placeholder-notice">
        <strong>Platzhalter.</strong> Dies ist kein rechtsgültiger Text. Der Betreiber dieser Nythera-Instanz muss diesen Text vor dem
        Produktivbetrieb durch eine echte, für seine Rechtsordnung geprüfte Datenschutzerklärung ersetzen (u.a. Angaben zur
        verantwortlichen Stelle, Rechtsgrundlagen der Verarbeitung nach Art. 6 DSGVO, eingesetzte Auftragsverarbeiter wie Hosting- und
        Zahlungsanbieter, Speicherdauer, Betroffenenrechte und Kontakt der Aufsichtsbehörde).
      </p>
      <p>Version: {CURRENT_PRIVACY_VERSION}</p>
      <h2>Welche technischen Möglichkeiten Nythera bereits bietet</h2>
      <ul>
        <li>Auskunft/Datenexport der eigenen Daten unter Konto-Einstellungen.</li>
        <li>Recht auf Löschung (Kontolöschung mit Anonymisierung) unter Konto-Einstellungen.</li>
        <li>Protokollierte, versionierte Einwilligung bei der Registrierung.</li>
      </ul>
    </div>
  );
}
