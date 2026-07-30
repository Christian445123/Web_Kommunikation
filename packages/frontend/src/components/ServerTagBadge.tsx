import { useServersStore } from "../store/servers.js";

interface Props {
  showcasedServerId: string | null | undefined;
}

const DEFAULT_TAG_COLOR = 0x5865f2;

/**
 * Only renders if the showcased server happens to already be loaded in the viewer's own
 * servers store (i.e. the viewer is also a member of it) - there is no public cross-server
 * tag lookup yet, a known limitation for viewers who aren't in the showcased server.
 */
export function ServerTagBadge({ showcasedServerId }: Props) {
  const server = useServersStore((s) => (showcasedServerId ? s.servers.find((sv) => sv.id === showcasedServerId) : undefined));
  if (!server?.tag) return null;

  return (
    <span
      className="server-tag-badge"
      style={{ background: `#${(server.tagColor ?? DEFAULT_TAG_COLOR).toString(16).padStart(6, "0")}` }}
      title={server.name}
    >
      {server.tagIconUrl && <img src={server.tagIconUrl} alt="" />}
      {server.tag}
    </span>
  );
}
