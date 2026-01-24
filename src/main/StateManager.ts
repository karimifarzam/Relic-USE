import { dbHelpers } from './db';

class StateManager {
  private activeSessionId: number | null = null;

  private startTime: number | null = null;

  private pausedTime: number | null = null;

  private totalPausedDuration: number = 0;

  setActiveSession(sessionId: number) {
    this.activeSessionId = sessionId;
    this.startTime = Date.now();
    this.pausedTime = null;
    this.totalPausedDuration = 0;
  }

  getActiveSessionId() {
    return this.activeSessionId;
  }

  getCurrentDuration(): number {
    if (!this.startTime) return 0;

    const now = Date.now();
    const totalDuration = Math.floor((now - this.startTime) / 1000);
    return Math.max(
      0,
      totalDuration - Math.floor(this.totalPausedDuration / 1000),
    );
  }

  pauseActiveSession() {
    if (!this.pausedTime) {
      this.pausedTime = Date.now();
    }
  }

  resumeActiveSession() {
    if (this.pausedTime) {
      this.totalPausedDuration += Date.now() - this.pausedTime;
      this.pausedTime = null;
    }
  }

  stopActiveSession() {
    const sessionId = this.activeSessionId;
    const finalDuration = this.getCurrentDuration();

    this.activeSessionId = null;
    this.startTime = null;
    this.pausedTime = null;
    this.totalPausedDuration = 0;

    return { sessionId, finalDuration };
  }

  async initializeFromDb(db: typeof dbHelpers) {
    if (this.activeSessionId) {
      const session = await db.getSession(this.activeSessionId);
      if (session) {
        // Update duration in memory
        const currentDuration = this.getCurrentDuration();
        if (currentDuration > 0) {
          await db.updateDuration(this.activeSessionId, currentDuration);
        }
      }
    }
  }
}

const stateManager = new StateManager();
export default stateManager;
