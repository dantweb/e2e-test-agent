// Jest setup file
// This file runs before all tests

// Polyfill fetch for Node.js test environment
if (!globalThis.fetch) {
  const { fetch, Headers, Request, Response } = require('undici');
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}
