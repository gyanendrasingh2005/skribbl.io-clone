import type { PlayerPublic } from "./types.js";

export class Player {
  id: string;
  name: string;
  score = 0;
  isHost: boolean;
  isReady = false;
  hasGuessed = false;
  socketId: string;

  constructor(id: string, name: string, socketId: string, isHost = false) {
    this.id = id;
    this.name = name;
    this.socketId = socketId;
    this.isHost = isHost;
  }

  toPublic(): PlayerPublic {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      isHost: this.isHost,
      isReady: this.isReady,
      hasGuessed: this.hasGuessed,
    };
  }

  resetRoundState(): void {
    this.hasGuessed = false;
  }
}
