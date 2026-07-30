import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { BotApplication } from "@nythera/shared";
import { Permission, combinePermissions, permissionsToString } from "@nythera/shared";
import { botsApi } from "../../api/resources.js";
import { useBotsStore } from "../../store/bots.js";
import { PermissionGrid } from "../../components/PermissionGrid.js";

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const regenerateToken = useBotsStore((s) => s.regenerateToken);
  const [app, setApp] = useState<BotApplication | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<bigint>(combinePermissions([Permission.VIEW_CHANNEL, Permission.SEND_MESSAGES]));

  useEffect(() => {
    if (id) void botsApi.get(id).then(setApp);
  }, [id]);

  if (!app || !id) return <div className="legal-page">Lade…</div>;

  const inviteLink = `${window.location.origin}/bot-invite/${id}?permissions=${permissionsToString(permissions)}`;

  async function handleRegenerate() {
    const token = await regenerateToken(id!);
    setNewToken(token);
  }

  return (
    <div className="legal-page">
      <button className="icon-button" onClick={() => navigate("/developer")}>
        ← Zurück
      </button>
      <h1>{app.name}</h1>
      <p style={{ color: "#96989d" }}>Bot-User-ID: {app.botUserId}</p>

      <h2>Token</h2>
      <p style={{ color: "#96989d" }}>Aktuell: …{app.tokenLastFour}. Beim Zurücksetzen wird der alte Token sofort ungültig.</p>
      {newToken && (
        <div className="legal-placeholder-notice">
          <strong>Neuer Token (nur jetzt sichtbar):</strong>
          <div style={{ fontFamily: "monospace", wordBreak: "break-all", marginTop: 8 }}>{newToken}</div>
        </div>
      )}
      <button className="save-button" onClick={handleRegenerate}>
        Token zurücksetzen
      </button>

      <h2 style={{ marginTop: 32 }}>Invite-Link generieren</h2>
      <p style={{ color: "#96989d" }}>Wähle die Rechte, die der Bot beim Beitritt zu einem Server erhalten soll.</p>
      <PermissionGrid value={permissions} onChange={setPermissions} />
      <div className="form-field">
        <label>Invite-Link</label>
        <input readOnly value={inviteLink} onClick={(e) => e.currentTarget.select()} />
      </div>
      <button className="save-button" onClick={() => navigator.clipboard.writeText(inviteLink)}>
        Link kopieren
      </button>
    </div>
  );
}
