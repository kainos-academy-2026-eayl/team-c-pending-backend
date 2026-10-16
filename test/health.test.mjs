import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'vitest';
import { createApp } from '../src/app.ts';

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

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^application\/json/);
    assert.deepEqual(Object.keys(body).sort(), ['status', 'time']);
    assert.equal(body.status, 'UP');
    assert.equal(typeof body.time, 'string');
    const timestamp = Date.parse(body.time);
    assert.ok(timestamp >= before && timestamp <= after);
    assert.equal(new Date(timestamp).toISOString(), body.time);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
