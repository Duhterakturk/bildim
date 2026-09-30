import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker({ cached, offline = false, storageFails = false } = {}) {
  const handlers = {};
  const fetch = vi.fn(async () => { if (offline) throw new Error('offline'); return new Response('network'); });
  runInNewContext(source, {
    self: { location: { origin: 'https://bildim.onrender.com' }, addEventListener: (type, fn) => { handlers[type] = fn; } },
    caches: {
      match: async () => { if (storageFails) throw new Error('storage'); return cached; },
      open: async () => { if (storageFails) throw new Error('quota'); return { put: async () => {} }; },
    }, fetch, Response, URL, setTimeout, clearTimeout,
  });
  return { fetch, request(path = '/assets/app.js', mode = 'cors', method = 'GET') {
    let result;
    handlers.fetch({ request: { url: new URL(path, 'https://bildim.onrender.com').href, mode, method }, respondWith: (value) => { result = value; } });
    return result;
  } };
}
describe('service worker network and storage failures', () => {
  it('returns a valid unavailable response for an uncached offline asset', async () => {
    const response = await worker({ offline: true }).request();
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toContain('text/plain');
  });
  it('returns a retry page for offline navigation without retrying the failed request', async () => {
    const sw = worker({ offline: true });
    const response = await sw.request('/games/pentominolar', 'navigate');
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('Yeniden dene');
    expect(sw.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(['cors', 'navigate'])('uses cached content offline (%s)', async (mode) => {
    const response = await worker({ offline: true, cached: new Response('cached') }).request('/', mode);
    expect(await response.text()).toBe('cached');
  });
  it('serves the network even when cache storage fails', async () => {
    const response = await worker({ storageFails: true }).request();
    expect(await response.text()).toBe('network');
  });
  it('handles simultaneous cache and network failure', async () => {
    expect((await worker({ storageFails: true, offline: true }).request('/', 'navigate')).status).toBe(503);
  });
  it('does not intercept API, cross-origin or mutation requests', () => {
    const sw = worker();
    expect(sw.request('/api/me')).toBeUndefined();
    expect(sw.request('https://example.com/a')).toBeUndefined();
    expect(sw.request('/', 'cors', 'POST')).toBeUndefined();
    expect(sw.fetch).not.toHaveBeenCalled();
  });
});
