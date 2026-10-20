import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApp } from '../src/app';
import 'dotenv/config';

vi.mock('../src/app', () => ({ createApp: vi.fn() }));

describe('server startup', () => {
  let listen;
  let close;
  let signalHandlers;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('PORT', '3000');
    signalHandlers = new Map();
    vi.spyOn(process, 'on').mockImplementation((signal, handler) => {
      signalHandlers.set(signal, handler);
      return process;
    });
    vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    close = vi.fn((callback) => callback());
    listen = vi.fn((_port, _host, callback) => {
      callback();
      return { close };
    });
    vi.mocked(createApp).mockReturnValue({ listen });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  test.each(['0', '3000', '65535'])(
    'listens on valid port %s',
    async (port) => {
      vi.stubEnv('PORT', port);
      await import('../src/index.ts');

      expect(listen).toHaveBeenCalledWith(
        Number(port),
        '0.0.0.0',
        expect.any(Function),
      );
      expect(console.log).toHaveBeenCalledWith(
        `Listening on http://0.0.0.0:${port}`,
      );
    },
  );

  test('rejects a missing port', async () => {
    vi.stubEnv('PORT', undefined);

    await expect(import('../src/index.ts')).rejects.toThrow(
      'PORT environment variable is not set',
    );
    expect(listen).not.toHaveBeenCalled();
  });

  test.each(['abc', '-1', '65536', '1.5'])(
    'rejects invalid port %s',
    async (port) => {
      vi.stubEnv('PORT', port);

      await expect(import('../src/index.ts')).rejects.toThrow(
        `Invalid PORT: ${port}`,
      );
      expect(listen).not.toHaveBeenCalled();
    },
  );

  test.each(['SIGINT', 'SIGTERM'])(
    'closes the server on %s',
    async (signal) => {
      await import('../src/index.ts');
      signalHandlers.get(signal)();

      expect(close).toHaveBeenCalledOnce();
      expect(process.exit).toHaveBeenCalledWith(0);
    },
  );
});
