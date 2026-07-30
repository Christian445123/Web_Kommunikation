import { useEffect, useState } from "react";
import { useServersStore } from "../../store/servers.js";

const DEFAULT_TAG_COLOR = 0x5865f2;

function colorToHex(color: number | null): string {
  return `#${(color ?? DEFAULT_TAG_COLOR).toString(16).padStart(6, "0")}`;
}

function hexToColor(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

interface Props {
  serverId: string;
}

export function TagTab({ serverId }: Props) {
  const server = useServersStore((s) => s.servers.find((sv) => sv.id === serverId));
  const updateServer = useServersStore((s) => s.updateServer);
  const [tag, setTag] = useState(server?.tag ?? "");
  const [tagIconUrl, setTagIconUrl] = useState(server?.tagIconUrl ?? "");
  const [tagColor, setTagColor] = useState(colorToHex(server?.tagColor ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTag(server?.tag ?? "");
    setTagIconUrl(server?.tagIconUrl ?? "");
    setTagColor(colorToHex(server?.tagColor ?? null));
  }, [server?.id]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await updateServer(serverId, {
        tag: tag.trim() ? tag.trim().toUpperCase() : null,
        tagIconUrl: tagIconUrl.trim() ? tagIconUrl.trim() : null,
        tagColor: tag.trim() ? hexToColor(tagColor) : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Server-Tag</h2>
      <p style={{ color: "#96989d" }}>
        Ein kurzes Tag (max. 4 Zeichen) + Icon, das Mitglieder freiwillig neben ihrem Namen zeigen können. Kostenlos für jeden Server —
        kein Bezahlvorteil.
      </p>
      <div className="form-field">
        <label>Tag (max. 4 Zeichen)</label>
        <input value={tag} maxLength={4} onChange={(e) => setTag(e.target.value)} placeholder="z.B. NYTH" />
      </div>
      <div className="form-field">
        <label>Tag-Icon-URL</label>
        <input value={tagIconUrl} onChange={(e) => setTagIconUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="form-field">
        <label>Tag-Farbe</label>
        <input type="color" value={tagColor} onChange={(e) => setTagColor(e.target.value)} />
      </div>
      {error && <div className="auth-error">{error}</div>}
      <button className="save-button" onClick={handleSave} disabled={saving}>
        Speichern
      </button>
    </div>
  );
}
