import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBotsStore } from "../../store/bots.js";

export function DeveloperPortal() {
  const applications = useBotsStore((s) => s.applications);
  const load = useBotsStore((s) => s.load);
  const create = useBotsStore((s) => s.create);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!name.trim()) return;
    const result = await create({ name: name.trim() });
    setCreatedToken(result.token);
    setName("");
  }

  return (
    <div className="legal-page">
      <h1>Developer Portal</h1>
      <p style={{ color: "#96989d" }}>Erstelle Bot-Applications, verwalte Tokens und generiere Invite-Links mit begrenzten Rechten.</p>

      {createdToken && (
        <div className="legal-placeholder-notice">
          <strong>Bot-Token (nur jetzt sichtbar):</strong>
          <div style={{ fontFamily: "monospace", wordBreak: "break-all", marginTop: 8 }}>{createdToken}</div>
          <button className="save-button" style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(createdToken)}>
            Kopieren
          </button>
        </div>
      )}

      <div className="inline-form" style={{ maxWidth: 400 }}>
        <input placeholder="Name der Application" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={handleCreate}>Erstellen</button>
      </div>

      <h2 style={{ marginTop: 32 }}>Meine Applications</h2>
      {applications.map((app) => (
        <div key={app.id} className="roles-list-item" onClick={() => navigate(`/developer/${app.id}`)}>
          {app.name} <span style={{ color: "#72767d", marginLeft: 8 }}>…{app.tokenLastFour}</span>
        </div>
      ))}
    </div>
  );
}
