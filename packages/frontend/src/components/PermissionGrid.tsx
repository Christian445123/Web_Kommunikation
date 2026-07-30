import { Permission, type PermissionFlag } from "@nythera/shared";

interface PermissionGroup {
  label: string;
  flags: { flag: PermissionFlag; label: string; description: string }[];
}

const GROUPS: PermissionGroup[] = [
  {
    label: "Allgemein",
    flags: [
      { flag: Permission.VIEW_CHANNEL, label: "Kanäle ansehen", description: "Kann Textkanäle des Servers sehen und lesen." },
      { flag: Permission.CREATE_INVITE, label: "Einladung erstellen", description: "Kann Invite-Links für den Server generieren." },
    ],
  },
  {
    label: "Mitgliedschaft",
    flags: [
      { flag: Permission.KICK_MEMBERS, label: "Mitglieder entfernen", description: "Kann Mitglieder aus dem Server werfen." },
      { flag: Permission.BAN_MEMBERS, label: "Mitglieder bannen", description: "Kann Mitglieder dauerhaft sperren." },
    ],
  },
  {
    label: "Verwaltung",
    flags: [
      { flag: Permission.MANAGE_MESSAGES, label: "Nachrichten verwalten", description: "Kann fremde Nachrichten löschen." },
      { flag: Permission.MANAGE_CHANNELS, label: "Kanäle verwalten", description: "Kann Kanäle erstellen, bearbeiten, löschen." },
      { flag: Permission.MANAGE_ROLES, label: "Rollen verwalten", description: "Kann Rollen erstellen, bearbeiten, zuweisen." },
      { flag: Permission.MANAGE_SERVER, label: "Server verwalten", description: "Kann Servereinstellungen, Banner, Tag ändern." },
    ],
  },
  {
    label: "Voice",
    flags: [
      { flag: Permission.CONNECT, label: "Verbinden", description: "Kann Sprachkanälen beitreten." },
      { flag: Permission.SPEAK, label: "Sprechen", description: "Kann in Sprachkanälen sprechen." },
    ],
  },
  {
    label: "Gefährlich",
    flags: [
      {
        flag: Permission.ADMINISTRATOR,
        label: "Administrator",
        description: "Umgeht alle Berechtigungsprüfungen. Nur an vertrauenswürdige Rollen vergeben.",
      },
    ],
  },
];

interface Props {
  value: bigint;
  onChange: (mask: bigint) => void;
  disabled?: boolean;
}

export function PermissionGrid({ value, onChange, disabled }: Props) {
  function toggle(flag: PermissionFlag) {
    if (disabled) return;
    const isSet = (value & flag) === flag;
    onChange(isSet ? value & ~flag : value | flag);
  }

  return (
    <div className="permission-grid">
      {GROUPS.map((group) => (
        <div className="permission-group" key={group.label}>
          <h4>{group.label}</h4>
          {group.flags.map(({ flag, label, description }) => {
            const checked = (value & flag) === flag;
            return (
              <label key={label} className={`permission-row ${flag === Permission.ADMINISTRATOR ? "dangerous" : ""}`}>
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(flag)} />
                <span>
                  <strong>{label}</strong>
                  <div className="permission-description">{description}</div>
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
