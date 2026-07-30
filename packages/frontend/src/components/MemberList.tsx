import { useServersStore } from "../store/servers.js";
import { usePresenceStore } from "../store/presence.js";
import { useUser } from "../hooks/useUser.js";

interface Props {
  serverId: string;
}

function MemberRow({ userId }: { userId: string }) {
  const user = useUser(userId);
  const status = usePresenceStore((s) => s.statusByUser[userId] ?? "offline");
  return (
    <div className="member-row">
      <div className={`presence-dot ${status === "online" ? "online" : ""}`} />
      <span>{user?.displayName ?? userId.slice(0, 8)}</span>
    </div>
  );
}

export function MemberList({ serverId }: Props) {
  const members = useServersStore((s) => s.membersByServer[serverId] ?? []);
  return (
    <div className="member-list">
      <h3>Mitglieder — {members.length}</h3>
      {members.map((m) => (
        <MemberRow key={m.userId} userId={m.userId} />
      ))}
    </div>
  );
}
