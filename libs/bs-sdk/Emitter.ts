import { ParamsType } from "./typestools";

export class Emitter<CB extends (...args: any[]) => void> {
  private events = new Set<CB>();
  private lastEmitArgs: ParamsType<CB> | undefined;
  constructor() {}

  size() {
    return this.events.size;
  }

  emitSync(...args: ParamsType<CB>) {
    const p: void[] = [];
    this.events.forEach((cb) => {
      p.push(cb(...args));
    });
    return p;
  }

  emitLifeCycle(...args: ParamsType<CB>) {
    this.lastEmitArgs = args;
    return Promise.resolve().then(() => {
      try {
        this.emitSync(...args);
      } catch (error) {
        return Promise.reject(error);
      }
    });
  }

  emit(...args: ParamsType<CB>) {
    return Promise.resolve().then(() => {
      try {
        this.emitSync(...args);
      } catch (error) {
        return Promise.reject(error);
      }
    });
  }

  on(cb: CB) {
    if (this.lastEmitArgs) {
      cb(...this.lastEmitArgs);
    }
    this.events.add(cb);
    return () => {
      this.off(cb);
    };
  }

  wait() {
    return new Promise<ParamsType<CB>>((resolve) => {
      const cb = (...args: ParamsType<CB>) => {
        resolve(args);
        clear();
      };
      const clear = this.on(cb as CB);
    });
  }

  off(cb: CB) {
    this.events.delete(cb);
  }

  destroy() {
    this.events.clear();
  }
}
