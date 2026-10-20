import { once } from 'node:events';
import { expect, test } from 'vitest';
import { createApp } from '../src/app.ts';
import 'dotenv/config';

test('GET /health returns UP and the current ISO timestamp', async () => {
  const server = createApp().listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const before = Date.now();
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/health`,
    );
    const body = await response.json();
    const after = Date.now();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(Object.keys(body).sort()).toEqual(['status', 'time']);
    expect(body.status).toBe('UP');
    expect(typeof body.time).toBe('string');
    const timestamp = Date.parse(body.time);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
    expect(new Date(timestamp).toISOString()).toBe(body.time);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
