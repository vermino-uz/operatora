import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import { tokenStorage } from "@/services/api/token-storage";

/**
 * Singleton Socket.io client (namespace `/`, matching the backend gateway —
 * see ARCHITECTURE.md "WebSocket/Realtime"). Connects lazily on first use,
 * not at module load, so pages that never need realtime never open a
 * socket. Auth token is read fresh at connect time (and on each manual
 * reconnect after a token refresh) rather than captured once.
 *
 * Topic subscribe/unsubscribe helpers and the event->queryClient mapping
 * belong in `subscriptions.ts`, built out alongside the first realtime
 * feature (not part of this scaffolding pass).
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(env.wsUrl, {
    transports: ["websocket"],
    autoConnect: false,
    auth: (cb) => cb({ token: tokenStorage.getAccessToken() }),
  });

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
