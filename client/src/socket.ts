import { io, Socket } from "socket.io-client";

/**
 * Local: empty URL + Vite proxy to backend.
 * Two Vercel projects: set VITE_SOCKET_URL to the server deployment URL.
 */
const API_URL = import.meta.env.VITE_SOCKET_URL || "";

/** Serverless Vercel API hosts — avoid for Socket.IO; use Azure/Render instead. */
function isVercelApiUrl(url: string): boolean {
  return /vercel\.app/i.test(url);
}

function isPersistentApiUrl(url: string): boolean {
  return /\.azurewebsites\.net$/i.test(url) || /onrender\.com$/i.test(url);
}

function socketTransports(): ("websocket" | "polling")[] {
  if (!API_URL) return ["websocket", "polling"];
  // Vercel: start with polling, then upgrade so later polls are not routed to another instance.
  if (isVercelApiUrl(API_URL)) return ["polling", "websocket"];
  return ["websocket", "polling"];
}

export function createSocket(): Socket {
  const vercelRemote = Boolean(API_URL) && isVercelApiUrl(API_URL);
  const persistent = Boolean(API_URL) && isPersistentApiUrl(API_URL);
  return io(API_URL, {
    autoConnect: false,
    path: "/socket.io",
    transports: persistent ? ["websocket", "polling"] : socketTransports(),
    upgrade: true,
    withCredentials: !vercelRemote && !persistent,
    reconnectionAttempts: 12,
    reconnectionDelayMax: 5000,
  });
}

export type SocketAck<T> = (response: { ok: boolean; error?: string; data?: T }) => void;

export function emitAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 8000
): Promise<{ ok: boolean; error?: string; data?: T }> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({
        ok: false,
        error: remoteHint(),
      });
      return;
    }
    const timer = setTimeout(() => {
      resolve({ ok: false, error: "Server did not respond. Is the backend deployment running?" });
    }, timeoutMs);
    socket.emit(event, payload, (res: { ok: boolean; error?: string; data?: T }) => {
      clearTimeout(timer);
      resolve(res ?? { ok: false, error: "No response from server" });
    });
  });
}

function remoteHint(): string {
  if (import.meta.env.PROD && !API_URL) {
    return "Set VITE_SOCKET_URL to your API host (e.g. Azure App Service), then redeploy the client.";
  }
  return "Not connected. Run npm run dev locally or check VITE_SOCKET_URL.";
}
