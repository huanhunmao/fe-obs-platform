import { Engine, Plugin, Event } from '@fe/core';

export type SDKOptions = {
  appId: string;
  endpoint?: string;
  ws?: string;
  plugins?: Plugin[];
};

export class FEObsSDK {
  private engine: Engine;
  private endpoint: string;

  constructor(opts: SDKOptions) {
    const endpoint = opts.endpoint ?? 'http://localhost:8787/ingest';
    this.endpoint = endpoint;
    this.engine = new Engine(opts.appId, (evt: Event) => this.dispatch(evt));
    (opts.plugins ?? []).forEach(p => this.engine.use(p));
    this.engine.use({
      name: 'heartbeat',
      setup: ({ send }) => {
        const id = setInterval(() => send({ type: 'custom', name: 'heartbeat', ts: Date.now() }), 5000);
        return () => clearInterval(id);
      }
    });
  }

  async start() {
    await this.engine.setup();
    this.bootstrapPerfObservers();
    this.patchXHRAndFetch();
  }

  stop() {
    this.engine.teardown();
  }

  emit(evt: Event) { this.engine.emit(evt); }

  private dispatch(evt: Event) {
    try {
      const payload = JSON.stringify(evt);
      if (navigator && 'sendBeacon' in navigator) {
        const ok = (navigator as any).sendBeacon(this.endpoint, payload);
        if (ok) return;
      }
      fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    } catch {}
  }

  private bootstrapPerfObservers() {
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.emit({ type: 'perf', name: 'LCP', value: (entry as any).renderTime || (entry as any).startTime, ts: Date.now() });
          }
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.emit({ type: 'perf', name: 'CLS', value: (entry as any).value, ts: Date.now() });
          }
        }
      });
      (po as any).observe({ type: 'largest-contentful-paint', buffered: true });
      (po as any).observe({ type: 'layout-shift', buffered: true });

      const onFirstInput = (e: any) => {
        const delay = performance.now() - e.timeStamp;
        this.emit({ type: 'perf', name: 'FID', value: delay, ts: Date.now() });
        window.removeEventListener('pointerdown', onFirstInput, true);
        window.removeEventListener('keydown', onFirstInput, true);
      };
      window.addEventListener('pointerdown', onFirstInput, true);
      window.addEventListener('keydown', onFirstInput, true);

      window.addEventListener('error', (e: ErrorEvent) => {
        this.emit({ type: 'error', message: e.message, stack: (e.error && (e.error as any).stack) || '', ts: Date.now() });
      });
      window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
        this.emit({ type: 'error', message: String(e.reason), ts: Date.now() });
      });
    } catch {}
  }

  private patchXHRAndFetch() {
    const XHR = XMLHttpRequest.prototype as any;
    const open = XHR.open;
    const send = XHR.send;
    XHR.open = function(method: string, url: string) {
      this.__method = method;
      this.__url = url;
      return open.apply(this, arguments as any);
    };
    XHR.send = function() {
      const start = performance.now();
      this.addEventListener('loadend', () => {
        const { __method, __url, status } = this;
        const dur = performance.now() - start;
        (window as any).__feobs?.emit({ type: 'xhr', url: __url, method: __method, duration: dur, status, ts: Date.now() });
      });
      return send.apply(this, arguments as any);
    };

    const _fetch = window.fetch.bind(window);
    (window as any).fetch = async (input: any, init: any = {}) => {
      const method = (init.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : input.url;
      const start = performance.now();
      const res = await _fetch(input, init);
      const dur = performance.now() - start;
      (window as any).__feobs?.emit({ type: 'fetch', url, method, duration: dur, status: (res as any).status, ts: Date.now() });
      return res;
    };
  }
}

export const SlowApiTagPlugin = (threshold = 500): Plugin => ({
  name: 'slow-api-tag',
  onEvent(evt, ctx) {
    if ((evt.type === 'xhr' || evt.type === 'fetch') && (evt as any).url.includes('/api/')) {
      if ((evt as any).duration > threshold) {
        ctx.setState({ lastSlowApi: { url: (evt as any).url, duration: (evt as any).duration } });
        ctx.send({ type: 'custom', name: 'slow-api', payload: { url: (evt as any).url, duration: (evt as any).duration }, ts: Date.now() });
      }
    }
  }
});

(window as any).__feobs = { FEObsSDK, SlowApiTagPlugin };