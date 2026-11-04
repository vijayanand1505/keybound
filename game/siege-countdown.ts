/** Advance only while the launch screen is active; browser interruptions cancel it. */
export class SiegeCountdown {
  private remaining = 3;
  get value() {
    return Math.max(1, Math.ceil(this.remaining - 1e-8));
  }
  advance(dt: number) {
    if (Number.isFinite(dt) && dt > 0)
      this.remaining = Math.max(0, this.remaining - Math.min(dt, 0.1));
    return this.remaining < 1e-8;
  }
}
