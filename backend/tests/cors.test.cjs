const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { allowCrossOrigin } = require('../dist/middleware/cors');

test('browser profile and plan requests pass preflight and can read auth errors', async () => {
  const app = express();
  app.use(allowCrossOrigin);
  let authenticatedRequests = 0;
  app.use((_req, res) => {
    authenticatedRequests++;
    res.status(401).json({ error: 'Authentication required.' });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/profile', '/plan']) {
      for (const method of ['GET', 'PUT']) {
        const preflight = await fetch(`${base}${path}`, {
          method: 'OPTIONS',
          headers: {
            Origin: 'http://localhost:8081',
            'Access-Control-Request-Method': method,
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
        assert.ok(preflight.headers.get('access-control-allow-methods').includes(method));
        const headers = preflight.headers.get('access-control-allow-headers').toLowerCase();
        assert.ok(headers.includes('authorization'));
        assert.ok(headers.includes('content-type'));
      }
    }
    assert.equal(authenticatedRequests, 0, 'preflight must bypass token authentication');
    const response = await fetch(`${base}/profile`, {
      headers: { Origin: 'http://localhost:8081' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.deepEqual(await response.json(), { error: 'Authentication required.' });
    assert.equal(authenticatedRequests, 1, 'actual requests must still require authentication');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
