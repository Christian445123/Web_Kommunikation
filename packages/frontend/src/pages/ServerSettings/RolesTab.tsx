import { useEffect, useState } from "react";
import type { Role } from "@nythera/shared";
import { permissionsFromString, permissionsToString } from "@nythera/shared";
import { useServersStore } from "../../store/servers.js";
import { PermissionGrid } from "../../components/PermissionGrid.js";

const DEFAULT_ROLE_COLOR = 0x99aab5;

function colorToHex(color: number | null): string {
  return `#${(color ?? DEFAULT_ROLE_COLOR).toString(16).padStart(6, "0")}`;
}

function hexToColor(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

interface Props {
  serverId: string;
}

export function RolesTab({ serverId }: Props) {
  const roles = useServersStore((s) => s.rolesByServer[serverId] ?? []);
  const createRole = useServersStore((s) => s.createRole);
  const updateRole = useServersStore((s) => s.updateRole);
  const deleteRole = useServersStore((s) => s.deleteRole);
  const sorted = [...roles].sort((a, b) => a.position - b.position);
  const [selectedId, setSelectedId] = useState<string | null>(sorted[0]?.id ?? null);

  useEffect(() => {
    if (!selectedId && sorted.length > 0) setSelectedId(sorted[0]!.id);
  }, [sorted.length]);

  const selected = sorted.find((r) => r.id === selectedId) ?? null;

  async function handleCreate() {
    const role = await createRole(serverId, { name: "neue-rolle" });
    setSelectedId(role.id);
  }

  async function handleDelete(role: Role) {
    if (role.isDefault) return;
    await deleteRole(serverId, role.id);
    setSelectedId(sorted.find((r) => r.id !== role.id)?.id ?? null);
  }

  return (
    <div>
      <h2>Rollen</h2>
      <div className="roles-layout">
        <div className="roles-list">
          {sorted.map((role) => (
            <div key={role.id} className={`roles-list-item ${selectedId === role.id ? "active" : ""}`} onClick={() => setSelectedId(role.id)}>
              <span className="role-color-dot" style={{ background: colorToHex(role.color) }} />
              {role.name}
            </div>
          ))}
          <button className="save-button" style={{ marginTop: 12 }} onClick={handleCreate}>
            + Neue Rolle
          </button>
        </div>
        <div className="role-editor">
          {selected && (
            <RoleEditor
              key={selected.id}
              role={selected}
              onSave={(patch) => updateRole(serverId, selected.id, patch)}
              onDelete={() => handleDelete(selected)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RoleEditor({
  role,
  onSave,
  onDelete,
}: {
  role: Role;
  onSave: (patch: { name?: string; color?: number | null; icon?: string | null; permissions?: string }) => Promise<unknown>;
  onDelete: () => void;
}) {
  const managed = role.managedByBotApplicationId !== null;
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(colorToHex(role.color));
  const [icon, setIcon] = useState(role.icon ?? "");
  const [permissions, setPermissions] = useState(permissionsFromString(role.permissions));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name,
        color: hexToColor(color),
        icon: icon.trim() ? icon.trim() : null,
        permissions: permissionsToString(permissions),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {managed && <p style={{ color: "#96989d" }}>Diese Rolle wird von einem Bot verwaltet und ist schreibgeschützt.</p>}
      <div className="form-field">
        <label>Rollenname</label>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={managed || role.isDefault} />
      </div>
      <div className="form-field">
        <label>Farbe</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={managed} />
      </div>
      <div className="form-field">
        <label>Icon-URL</label>
        <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://…" disabled={managed} />
      </div>
      <div className="form-field">
        <label>Berechtigungen</label>
        <PermissionGrid value={permissions} onChange={setPermissions} disabled={managed} />
      </div>
      {!managed && (
        <button className="save-button" onClick={handleSave} disabled={saving}>
          Speichern
        </button>
      )}
      {!managed && !role.isDefault && (
        <button className="save-button" style={{ background: "#ed4245", marginLeft: 8 }} onClick={onDelete}>
          Rolle löschen
        </button>
      )}
    </div>
  );
}
