import { randomUUID } from "crypto";
import { Game } from "./Game.js";
import { Player } from "./Player.js";
import type { ChatMessage, RoomSettings, Stroke } from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";

function roomCode(): string {
  return randomUUID().slice(0, 6).toUpperCase();
}

export class Room {
  id: string;
  code: string;
  settings: RoomSettings;
  players: Map<string, Player> = new Map();
  game: Game;
  chatHistory: ChatMessage[] = [];

  constructor(hostName: string, hostSocketId: string, settings?: Partial<RoomSettings>) {
    this.id = randomUUID();
    this.code = roomCode();
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.game = new Game(this.settings);
    const host = new Player(randomUUID(), hostName, hostSocketId, true);
    this.players.set(host.id, host);
  }

  get playerList(): Player[] {
    return Array.from(this.players.values());
  }

  get host(): Player | undefined {
    return this.playerList.find((p) => p.isHost);
  }

  findBySocket(socketId: string): Player | undefined {
    return this.playerList.find((p) => p.socketId === socketId);
  }

  addPlayer(name: string, socketId: string): Player | null {
    if (this.players.size >= this.settings.maxPlayers) return null;
    if (this.game.phase !== "lobby") return null;
    const player = new Player(randomUUID(), name, socketId, false);
    this.players.set(player.id, player);
    return player;
  }

  removePlayer(playerId: string): Player | null {
    const player = this.players.get(playerId);
    if (!player) return null;
    this.players.delete(playerId);
    if (this.players.size > 0 && player.isHost) {
      const next = this.playerList[0];
      next.isHost = true;
    }
    return player;
  }

  updateSocket(playerId: string, socketId: string): void {
    const p = this.players.get(playerId);
    if (p) p.socketId = socketId;
  }

  canStart(): boolean {
    return (
      this.game.phase === "lobby" &&
      this.players.size >= 2 &&
      this.playerList.every((p) => p.isReady || p.isHost)
    );
  }

  awardGuessPoints(player: Player, rank: number): number {
    const base = Math.max(50, this.game.timeLeft);
    const points = Math.floor(base * (1 - rank * 0.15));
    player.score += Math.max(10, points);
    const drawer = this.game.getDrawer(this.playerList);
    if (drawer) drawer.score += 25;
    return Math.max(10, points);
  }

  pushChat(msg: ChatMessage): void {
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 200) this.chatHistory.shift();
  }

  getGameStateFor(playerId: string) {
    const drawer = this.game.getDrawer(this.playerList);
    const isDrawer = drawer?.id === playerId;
    const word =
      this.game.phase === "drawing" || this.game.phase === "round_end"
        ? isDrawer || this.game.phase === "round_end"
          ? this.game.currentWord
          : null
        : null;

    return {
      phase: this.game.phase,
      round: this.game.currentRound,
      totalRounds: this.settings.rounds,
      drawerId: drawer?.id ?? null,
      timeLeft: this.game.timeLeft,
      hint: this.game.getHintDisplay(),
      word,
      wordMode: this.settings.wordMode,
      scores: this.playerList.map((p) => p.toPublic()),
      strokes: this.game.strokes,
    };
  }

  getRoundStartPayload(drawerId: string) {
    const drawer = this.players.get(drawerId);
    return {
      drawerId,
      drawerName: drawer?.name,
      drawTime: this.settings.drawTime,
      round: this.game.currentRound,
    };
  }

  getWordOptionsForDrawer(drawerId: string): string[] | null {
    const drawer = this.game.getDrawer(this.playerList);
    if (!drawer || drawer.id !== drawerId) return null;
    return this.game.wordOptions;
  }
}
