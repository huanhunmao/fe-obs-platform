export type IngestEvent = any;
type Subscriber = (evt: IngestEvent) => void;

export class Pipeline {
  private subs: Record<string, Set<Subscriber>> = {};
  private buffer: IngestEvent[] = [];

  publish(topic: string, evt: IngestEvent) {
    (this.subs[topic] ??= new Set()).forEach(fn => fn(evt));
    this.buffer.push(evt);
    if (this.buffer.length > 2000) this.buffer.shift();
  }

  subscribe(topic: string, fn: Subscriber) {
    (this.subs[topic] ??= new Set()).add(fn);
    return () => this.subs[topic].delete(fn);
  }

  snapshot(limit = 200) {
    return this.buffer.slice(-limit);
  }
}