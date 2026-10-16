import { Room } from "./Room.js";
import type { RoomSettings } from "./types.js";

export class RoomManager {
  private rooms = new Map<string, Room>();
  private codeToId = new Map<string, string>();

  create(hostName: string, hostSocketId: string, settings?: Partial<RoomSettings>): Room {
    const room = new Room(hostName, hostSocketId, settings);
    this.rooms.set(room.id, room);
    this.codeToId.set(room.code, room.id);
    return room;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getByCode(code: string): Room | undefined {
    const id = this.codeToId.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  listPublic(): { id: string; code: string; players: number; maxPlayers: number }[] {
    return Array.from(this.rooms.values())
      .filter((r) => !r.settings.isPrivate && r.game.phase === "lobby")
      .map((r) => ({
        id: r.id,
        code: r.code,
        players: r.players.size,
        maxPlayers: r.settings.maxPlayers,
      }));
  }

  delete(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.codeToId.delete(room.code);
      this.rooms.delete(roomId);
    }
  }

  findRoomBySocket(socketId: string): { room: Room; player: import("./Player.js").Player } | null {
    for (const room of this.rooms.values()) {
      const player = room.findBySocket(socketId);
      if (player) return { room, player };
    }
    return null;
  }
}
