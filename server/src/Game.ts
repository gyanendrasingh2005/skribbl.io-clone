import { randomUUID } from "crypto";
import type { GamePhase, RoomSettings, Stroke } from "./types.js";
import type { Player } from "./Player.js";
import words from "./data/words.json";

export class Game {
  phase: GamePhase = "lobby";
  currentRound = 0;
  drawerIndex = 0;
  currentWord: string | null = null;
  wordOptions: string[] = [];
  strokes: Stroke[] = [];
  roundTimer: ReturnType<typeof setInterval> | null = null;
  hintTimer: ReturnType<typeof setInterval> | null = null;
  timeLeft = 0;
  revealedHintCount = 0;
  roundEnded = false;

  constructor(private settings: RoomSettings) {}

  getDrawer(players: Player[]): Player | null {
    if (players.length === 0) return null;
    return players[this.drawerIndex % players.length];
  }

  resetPlayersForRound(players: Player[]): void {
    for (const p of players) p.resetRoundState();
  }

  start(players: Player[]): void {
    this.currentRound = 1;
    this.drawerIndex = 0;
    this.beginWordSelect(players);
  }

  beginWordSelect(players: Player[]): void {
    this.clearTimers();
    this.phase = "word_select";
    this.currentWord = null;
    this.strokes = [];
    this.roundEnded = false;
    this.revealedHintCount = 0;
    this.wordOptions = this.pickWords(this.settings.wordCount);
    this.resetPlayersForRound(players);
  }

  private pickWords(count: number): string[] {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  chooseWord(word: string): boolean {
    if (!this.wordOptions.includes(word)) return false;
    this.currentWord = word;
    this.phase = "drawing";
    this.timeLeft = this.settings.drawTime;
    return true;
  }

  addStroke(stroke: Omit<Stroke, "id">): Stroke {
    const full: Stroke = { ...stroke, id: randomUUID() };
    this.strokes.push(full);
    return full;
  }

  undoLastStroke(): Stroke | null {
    const removed = this.strokes.pop();
    return removed ?? null;
  }

  clearCanvas(): void {
    this.strokes = [];
  }

  normalizeGuess(text: string): string {
    return text.trim().toLowerCase().replace(/\s+/g, " ");
  }

  checkGuess(text: string): boolean {
    if (!this.currentWord) return false;
    return this.normalizeGuess(text) === this.normalizeGuess(this.currentWord);
  }

  getHintDisplay(): string {
    if (!this.currentWord) return "";
    if (this.settings.hints <= 0) {
      return this.currentWord
        .split("")
        .map((c) => (c === " " ? " " : "_"))
        .join(" ");
    }
    const chars = this.currentWord.split("");
    const letterIndices: number[] = [];
    chars.forEach((c, i) => {
      if (c !== " ") letterIndices.push(i);
    });
    const revealSet = new Set(letterIndices.slice(0, this.revealedHintCount));
    return chars
      .map((c, i) => {
        if (c === " ") return " ";
        return revealSet.has(i) ? c.toUpperCase() : "_";
      })
      .join(" ");
  }

  scheduleHints(onTick: () => void): void {
    if (this.settings.hints <= 0 || !this.currentWord) return;
    const interval = Math.max(
      10,
      Math.floor(this.settings.drawTime / (this.settings.hints + 1))
    );
    this.hintTimer = setInterval(() => {
      if (this.phase !== "drawing" || this.roundEnded) return;
      const maxLetters = this.currentWord!.replace(/\s/g, "").length;
      if (this.revealedHintCount < maxLetters) {
        this.revealedHintCount++;
        onTick();
      }
    }, interval * 1000);
  }

  startRoundTimer(onTick: (timeLeft: number) => void, onEnd: () => void): void {
    this.clearRoundTimer();
    onTick(this.timeLeft);
    this.roundTimer = setInterval(() => {
      this.timeLeft--;
      onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.clearRoundTimer();
        onEnd();
      }
    }, 1000);
  }

  clearRoundTimer(): void {
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
      this.roundTimer = null;
    }
  }

  clearHintTimer(): void {
    if (this.hintTimer) {
      clearInterval(this.hintTimer);
      this.hintTimer = null;
    }
  }

  clearTimers(): void {
    this.clearRoundTimer();
    this.clearHintTimer();
  }

  /** Total turns = rounds * player count */
  advanceAfterRound(players: Player[]): { gameOver: boolean } {
    this.phase = "round_end";
    this.clearTimers();
    const totalTurns = this.settings.rounds * players.length;
    const completedTurn =
      (this.currentRound - 1) * players.length + this.drawerIndex + 1;
    if (completedTurn >= totalTurns) {
      this.phase = "game_over";
      return { gameOver: true };
    }
    this.drawerIndex++;
    if (this.drawerIndex >= players.length) {
      this.drawerIndex = 0;
      this.currentRound++;
    }
    return { gameOver: false };
  }
}
