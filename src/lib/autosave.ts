export type SaveState = "saved" | "pending" | "saving" | "invalid" | "error";

/** One request at a time; edits made during a request are saved next. */
export class Autosave<T> {
  private latest: T | null;
  private saved: string;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private stopped = false;

  constructor(
    initial: T,
    private persist: (value: T) => Promise<unknown>,
    private onState: (state: SaveState) => void,
    private delay = 600,
    private retryDelay = 5000,
  ) {
    this.latest = initial;
    this.saved = JSON.stringify(initial);
  }

  update(value: T | null) {
    this.latest = value;
    clearTimeout(this.timer);
    if (this.stopped) return;
    if (value === null) {
      this.onState("invalid");
    } else if (this.running) {
      this.onState("saving");
    } else if (JSON.stringify(value) === this.saved) {
      this.onState("saved");
    } else {
      this.onState("pending");
      this.schedule(this.delay);
    }
  }

  private schedule(delay: number) {
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  private async flush() {
    if (this.stopped || this.running || this.latest === null) return;
    const snapshot = this.latest;
    const key = JSON.stringify(snapshot);
    if (key === this.saved) return;
    this.running = true;
    this.onState("saving");
    let failed = false;
    try {
      await this.persist(snapshot);
      this.saved = key;
    } catch {
      failed = true;
    } finally {
      this.running = false;
    }
    if (this.stopped) return;
    if (this.latest === null) {
      this.onState("invalid");
    } else if (JSON.stringify(this.latest) === this.saved) {
      this.onState("saved");
    } else {
      this.onState(failed ? "error" : "pending");
      this.schedule(failed ? this.retryDelay : this.delay);
    }
  }

  dispose() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
}
