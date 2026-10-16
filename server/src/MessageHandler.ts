import type { Server, Socket } from "socket.io";
import type { RoomManager } from "./RoomManager.js";
import type { Room } from "./Room.js";
import type { RoomSettings, StrokePoint } from "./types.js";

type Ack = (response: { ok: boolean; error?: string; data?: unknown }) => void;

export class MessageHandler {
  constructor(
    private io: Server,
    private rooms: RoomManager
  ) {}

  register(socket: Socket): void {
    socket.on("create_room", (payload: { hostName: string; settings?: Partial<RoomSettings> }, ack?: Ack) => {
      const name = (payload?.hostName || "Host").trim().slice(0, 20);
      const room = this.rooms.create(name, socket.id, payload?.settings);
      const host = room.host!;
      socket.join(room.id);
      this.reply(ack, { ok: true, data: { roomId: room.id, code: room.code, playerId: host.id } });
      this.emitLobby(room);
    });

    socket.on("join_room", (payload: { roomId?: string; code?: string; playerName: string }, ack?: Ack) => {
      const room =
        (payload.roomId && this.rooms.get(payload.roomId)) ||
        (payload.code && this.rooms.getByCode(payload.code));
      if (!room) {
        return this.reply(ack, { ok: false, error: "Room not found" });
      }
      const name = (payload.playerName || "Player").trim().slice(0, 20);
      const player = room.addPlayer(name, socket.id);
      if (!player) {
        return this.reply(ack, { ok: false, error: "Cannot join room" });
      }
      socket.join(room.id);
      this.reply(ack, { ok: true, data: { roomId: room.id, code: room.code, playerId: player.id } });
      this.io.to(room.id).emit("player_joined", {
        player: player.toPublic(),
        players: room.playerList.map((p) => p.toPublic()),
      });
      this.emitLobby(room);
    });

    socket.on("list_public_rooms", (_payload, ack?: Ack) => {
      this.reply(ack, { ok: true, data: this.rooms.listPublic() });
    });

    socket.on("set_ready", (payload: { ready: boolean }) => {
      const ctx = this.getContext(socket);
      if (!ctx) return;
      const { room, player } = ctx;
      player.isReady = !!payload?.ready;
      this.emitLobby(room);
    });

    socket.on("start_game", () => {
      const ctx = this.getContext(socket);
      if (!ctx || !ctx.player.isHost) return;
      const { room } = ctx;
      if (!room.canStart()) return;
      room.game.start(room.playerList);
      this.broadcastGameState(room);
      this.startWordSelectPhase(room);
    });

    socket.on("word_chosen", (payload: { word: string }) => {
      const ctx = this.getContext(socket);
      if (!ctx) return;
      const { room, player } = ctx;
      const drawer = room.game.getDrawer(room.playerList);
      if (!drawer || drawer.id !== player.id) return;
      if (!room.game.chooseWord(payload.word)) return;
      this.io.to(room.id).emit("round_drawing_start", {
        timeLeft: room.game.timeLeft,
        hint: room.game.getHintDisplay(),
      });
      this.broadcastGameState(room);
      room.game.scheduleHints(() => {
        this.io.to(room.id).emit("hint_update", { hint: room.game.getHintDisplay() });
      });
      room.game.startRoundTimer(
        (timeLeft) => {
          this.io.to(room.id).emit("timer_tick", { timeLeft });
        },
        () => this.endRound(room, "timeout")
      );
    });

    socket.on(
      "draw_start",
      (
        payload: { x: number; y: number; color: string; size: number; isEraser?: boolean },
        ack?: Ack
      ) => {
        const ctx = this.getContext(socket);
        if (!ctx || !this.isDrawer(ctx)) return;
        const stroke = ctx.room.game.addStroke({
          points: [{ x: payload.x, y: payload.y }],
          color: payload.color,
          size: payload.size,
          isEraser: payload.isEraser,
        });
        const packet = { stroke, action: "add" as const };
        socket.to(ctx.room.id).emit("draw_data", packet);
        socket.emit("draw_data", packet);
        this.reply(ack, { ok: true, data: { strokeId: stroke.id } });
      }
    );

    socket.on("draw_move", (payload: { strokeId: string; x: number; y: number }) => {
      const ctx = this.getContext(socket);
      if (!ctx || !this.isDrawer(ctx)) return;
      const stroke = ctx.room.game.strokes.find((s) => s.id === payload.strokeId);
      if (!stroke) return;
      stroke.points.push({ x: payload.x, y: payload.y });
      const packet = {
        strokeId: payload.strokeId,
        point: { x: payload.x, y: payload.y },
        action: "move" as const,
      };
      socket.to(ctx.room.id).emit("draw_data", packet);
      socket.emit("draw_data", packet);
    });

    socket.on("draw_end", () => {
      /* stroke already tracked */
    });

    socket.on("canvas_clear", () => {
      const ctx = this.getContext(socket);
      if (!ctx || !this.isDrawer(ctx)) return;
      ctx.room.game.clearCanvas();
      this.io.to(ctx.room.id).emit("canvas_clear", {});
    });

    socket.on("draw_undo", () => {
      const ctx = this.getContext(socket);
      if (!ctx || !this.isDrawer(ctx)) return;
      const removed = ctx.room.game.undoLastStroke();
      this.io.to(ctx.room.id).emit("draw_undo", { strokeId: removed?.id });
    });

    socket.on("guess", (payload: { text: string }) => {
      const ctx = this.getContext(socket);
      if (!ctx) return;
      const { room, player } = ctx;
      if (room.game.phase !== "drawing" || room.game.roundEnded) return;
      if (this.isDrawer(ctx)) return;
      if (player.hasGuessed) return;
      const text = (payload.text || "").trim();
      if (!text) return;
      const correct = room.game.checkGuess(text);
      if (correct) {
        const rank = room.playerList.filter((p) => p.hasGuessed).length;
        player.hasGuessed = true;
        const points = room.awardGuessPoints(player, rank);
        this.io.to(room.id).emit("guess_result", {
          correct: true,
          playerId: player.id,
          playerName: player.name,
          points,
          text,
        });
        room.pushChat({
          playerId: player.id,
          playerName: player.name,
          text: `${player.name} guessed the word!`,
          isGuess: true,
          isCorrect: true,
          timestamp: Date.now(),
        });
        this.broadcastGameState(room);
        const drawerId = room.game.getDrawer(room.playerList)?.id;
        const nonDrawer = room.playerList.filter((p) => p.id !== drawerId);
        if (nonDrawer.every((p) => p.hasGuessed)) {
          this.endRound(room, "all_guessed");
        }
      } else {
        socket.emit("guess_result", {
          correct: false,
          playerId: player.id,
          playerName: player.name,
          points: 0,
          text,
        });
        room.pushChat({
          playerId: player.id,
          playerName: player.name,
          text,
          isGuess: true,
          isCorrect: false,
          timestamp: Date.now(),
        });
        this.io.to(room.id).emit("chat_message", {
          playerId: player.id,
          playerName: player.name,
          text,
          isGuess: true,
        });
      }
    });

    socket.on("chat", (payload: { text: string }) => {
      const ctx = this.getContext(socket);
      if (!ctx) return;
      const text = (payload.text || "").trim().slice(0, 200);
      if (!text) return;
      const msg = {
        playerId: ctx.player.id,
        playerName: ctx.player.name,
        text,
        isGuess: false,
        timestamp: Date.now(),
      };
      ctx.room.pushChat(msg);
      this.io.to(ctx.room.id).emit("chat_message", msg);
    });

    socket.on("disconnect", () => {
      const ctx = this.rooms.findRoomBySocket(socket.id);
      if (!ctx) return;
      const { room, player } = ctx;
      room.removePlayer(player.id);
      if (room.players.size === 0) {
        room.game.clearTimers();
        this.rooms.delete(room.id);
        return;
      }
      this.io.to(room.id).emit("player_left", {
        playerId: player.id,
        players: room.playerList.map((p) => p.toPublic()),
      });
      if (room.game.phase !== "lobby") {
        this.broadcastGameState(room);
      } else {
        this.emitLobby(room);
      }
    });
  }

  private getContext(socket: Socket): { room: Room; player: import("./Player.js").Player } | null {
    return this.rooms.findRoomBySocket(socket.id);
  }

  private isDrawer(ctx: { room: Room; player: import("./Player.js").Player }): boolean {
    return ctx.room.game.getDrawer(ctx.room.playerList)?.id === ctx.player.id;
  }

  private emitLobby(room: Room): void {
    this.io.to(room.id).emit("lobby_state", {
      code: room.code,
      roomId: room.id,
      settings: room.settings,
      players: room.playerList.map((p) => p.toPublic()),
      canStart: room.canStart(),
    });
  }

  private broadcastGameState(room: Room): void {
    for (const p of room.playerList) {
      this.io.to(p.socketId).emit("game_state", room.getGameStateFor(p.id));
    }
  }

  private startWordSelectPhase(room: Room): void {
    const drawer = room.game.getDrawer(room.playerList);
    if (!drawer) return;
    const base = room.getRoundStartPayload(drawer.id);
    for (const p of room.playerList) {
      const isDrawer = p.id === drawer.id;
      this.io.to(p.socketId).emit("round_start", {
        ...base,
        wordOptions: isDrawer ? room.game.wordOptions : null,
      });
    }
    this.broadcastGameState(room);
  }

  private endRound(room: Room, reason: string): void {
    if (room.game.roundEnded) return;
    room.game.roundEnded = true;
    room.game.clearTimers();
    const word = room.game.currentWord;
    const { gameOver } = room.game.advanceAfterRound(room.playerList);
    this.io.to(room.id).emit("round_end", {
      word,
      reason,
      scores: room.playerList.map((p) => p.toPublic()),
      gameOver,
    });
    this.broadcastGameState(room);
    if (gameOver) {
      const sorted = [...room.playerList].sort((a, b) => b.score - a.score);
      this.io.to(room.id).emit("game_over", {
        winner: sorted[0]?.toPublic(),
        leaderboard: sorted.map((p) => p.toPublic()),
      });
      room.game.phase = "lobby";
      room.playerList.forEach((p) => {
        p.isReady = false;
        p.score = 0;
      });
      this.emitLobby(room);
      return;
    }
    setTimeout(() => {
      room.game.beginWordSelect(room.playerList);
      this.startWordSelectPhase(room);
      this.broadcastGameState(room);
    }, 5000);
  }

  private reply(ack?: Ack, response?: { ok: boolean; error?: string; data?: unknown }): void {
    if (typeof ack === "function") ack(response ?? { ok: false });
  }
}
