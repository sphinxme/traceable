import { writable } from "svelte/store";

type Callback<T> = (set: Set<T>) => void;
type Unsubscriber = () => void;

class ReactiveSet<T> {
  set: Set<T>;
  subscribers: Set<Callback<T>>;
  constructor() {
    this.set = new Set();
    this.subscribers = new Set();
  }

  /**
   * subscribe
   */
  public subscribe(callback: Callback<T>): Unsubscriber {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * add
   */
  public add(value: T) {
    this.set.add(value);
    this.notify();
  }

  public delete(value: T) {
    this.set.delete(value);
    this.notify();
  }

  public has(value: T): boolean {
    return this.set.has(value);
  }

  private notify() {
    this.subscribers.forEach((callback) => {
      callback(this.set);
    });
  }
}

export const highlightFEventIds = new ReactiveSet<string>();

function name() {
  const w = writable(new Set<string>());

  w.update((s) => {
    s.add("aaa");
    return s;
  });
}
