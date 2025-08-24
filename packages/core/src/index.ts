export type Event =
  | { type: 'perf'; name: string; value: number; detail?: any; ts: number }
  | { type: 'error'; message: string; stack?: string; ts: number }
  | { type: 'xhr' | 'fetch'; url: string; method: string; duration: number; status: number; ts: number }
  | { type: 'custom'; name: string; payload?: any; ts: number };

export type Context = {
  appId: string;
  send: (evt: Event) => void;
  getState: () => Record<string, any>;
  setState: (patch: Record<string, any>) => void;
};

export type Plugin = {
  name: string;
  setup?: (ctx: Context) => void | (() => void) | Promise<void | (() => void)>;
  onEvent?: (evt: Event, ctx: Context) => void;
  teardown?: () => void;
};

export class Engine {
  private plugins: Plugin[] = [];
  private state: Record<string, any> = {};

  constructor(private appId: string, private dispatcher: (evt: Event) => void) {}

  use(plugin: Plugin) {
    this.plugins.push(plugin);
    return this;
  }

  async setup() {
    for (const p of this.plugins) {
      if (p.setup) {
        const res = await p.setup(this.ctx());
        if (typeof res === 'function') {
          (p as any).__cleanup = res;
        }
      }
    }
  }

  teardown() {
    for (const p of this.plugins) {
      if ((p as any).__cleanup) {
        try { (p as any).__cleanup(); } catch {}
      }
      if (p.teardown) {
        try { p.teardown(); } catch {}
      }
    }
  }

  emit(evt: Event) {
    // 统一入口: 插件链可拦截/扩展
    for (const p of this.plugins) {
      if (p.onEvent) {
        try { p.onEvent(evt, this.ctx()); } catch {}
      }
    }
    this.dispatcher(evt);
  }

  private ctx(): Context {
    return {
      appId: this.appId,
      send: (evt) => this.dispatcher(evt),
      getState: () => this.state,
      setState: (patch) => Object.assign(this.state, patch),
    };
  }
}