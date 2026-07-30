import { useEffect, useState } from "react";
import { ensureUser, getCachedUser, subscribeUserCache } from "../api/userCache.js";

export function useUser(id: string | undefined) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeUserCache(() => forceRender((n) => n + 1));
    ensureUser(id);
    return unsubscribe;
  }, [id]);

  return id ? getCachedUser(id) : undefined;
}
