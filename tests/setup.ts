// Jest setup file
// This file runs before all tests
// Ensure global Web APIs are present before requiring undici

// 1. Polyfill Blob from Node's built-in buffer module if missing
import { Blob as NodeBlob } from 'buffer';

if (typeof (globalThis as any).Blob === 'undefined') {
  (globalThis as any).Blob = NodeBlob;
}

// 2. Polyfill fetch and web streams for Node.js test environment
(() => {
  // If fetch already exists (e.g., Node 18+ or jsdom), leave everything as-is.
  if (typeof globalThis.fetch === 'function') {
    return;
  }

  // 2.1 Ensure Web Streams are available on globalThis before requiring 'undici'
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ReadableStream, WritableStream, TransformStream } = require('stream/web');

    if (typeof (globalThis as any).ReadableStream === 'undefined' && ReadableStream) {
      (globalThis as any).ReadableStream = ReadableStream;
    }
    if (typeof (globalThis as any).WritableStream === 'undefined' && WritableStream) {
      (globalThis as any).WritableStream = WritableStream;
    }
    if (typeof (globalThis as any).TransformStream === 'undefined' && TransformStream) {
      (globalThis as any).TransformStream = TransformStream;
    }
  } catch {
    // On very old Node versions where 'stream/web' is unavailable,
    // you could plug in a custom streams polyfill here if required.
  }

  // 2.2 Polyfill DOMException if missing (undici websocket requires it)
  if (typeof (globalThis as any).DOMException === 'undefined') {
    (globalThis as any).DOMException = class DOMException extends Error {
      constructor(message?: string, name?: string) {
        super(message);
        this.name = name || 'DOMException';
      }
    };
  }

  // 2.3 Minimal File polyfill if missing (undici expects File to exist)
  if (typeof (globalThis as any).File === 'undefined') {
    class NodeFile extends (globalThis as any).Blob {
      readonly name: string;
      readonly lastModified: number;

      constructor(
          fileBits: any[],
          fileName: string,
          options: { lastModified?: number; type?: string } = {},
      ) {
        super(fileBits, { type: options.type });
        this.name = fileName;
        this.lastModified = options.lastModified ?? Date.now();
      }
    }

    (globalThis as any).File = NodeFile;
  }

  // 2.4 Now require undici, which expects Blob, File, DOMException and Web Streams to be present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { fetch, Headers, Request, Response, FormData, File } = require('undici');

  // 2.5 Attach fetch-related globals if not already defined
  if (typeof globalThis.fetch === 'undefined') {
    (globalThis as any).fetch = fetch;
  }
  if (typeof (globalThis as any).Headers === 'undefined') {
    (globalThis as any).Headers = Headers;
  }
  if (typeof (globalThis as any).Request === 'undefined') {
    (globalThis as any).Request = Request;
  }
  if (typeof (globalThis as any).Response === 'undefined') {
    (globalThis as any).Response = Response;
  }
  if (typeof (globalThis as any).FormData === 'undefined') {
    (globalThis as any).FormData = FormData;
  }
  if (typeof (globalThis as any).File === 'undefined') {
    (globalThis as any).File = File;
  }

  // 2.6 Final safety check: if fetch is still missing, fail fast
  if (typeof globalThis.fetch === 'undefined') {
    throw new Error(
        'Global fetch is not available. Please run tests on Node 18+ or ensure a proper polyfill is in place.',
    );
  }
})();

// 3. Optionally re-export them so other files can import from here
export const fetchApi = {
  fetch: globalThis.fetch as typeof fetch,
  Headers: globalThis.Headers as typeof Headers,
  Request: globalThis.Request as typeof Request,
  Response: globalThis.Response as typeof Response,
  FormData: (globalThis as any).FormData as typeof FormData | undefined,
  File: (globalThis as any).File as typeof File | undefined, // may be undefined on some environments
};
