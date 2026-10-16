import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { RoomManager } from "./RoomManager.js";
import { MessageHandler } from "./MessageHandler.js";

/** Shared in-memory state (per serverless instance on Vercel). */
export const roomManager = new RoomManager();

export function setupSocketIO(
  httpServer: HttpServer,
  options: { path?: string; corsOrigin?: string | boolean | string[] } = {}
): Server {
  const io = new Server(httpServer, {
    path: options.path ?? "/socket.io",
    cors: {
      origin: options.corsOrigin ?? true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });
  const handler = new MessageHandler(io, roomManager);
  io.on("connection", (socket) => handler.register(socket));
  return io;
}
