import fetch from 'node-fetch';
import { GcpStorage, GcpStorageObject } from './storage';

jest.mock('node-fetch', () => jest.fn(), { virtual: true });

jest.mock('@teambit/toolbox.network.agent', () => ({
  getAgent: jest.fn(),
}), { virtual: true });

describe('GcpStorage', () => {
  it('returns an empty list when GCS omits items for an empty result', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({ kind: 'storage#objects' }),
    });
    const storage = new GcpStorage('bvm.bit.dev');

    await expect(storage.getFiles({ prefix: 'versions/dev/linux/' })).resolves.toEqual([]);
  });

  it('returns GCS object metadata when files match the prefix', async () => {
    const item: GcpStorageObject = {
      name: 'versions/dev/linux/2.1.0/bit-2.1.0.tar.gz',
      bucket: 'bvm.bit.dev',
      md5Hash: 'hash',
      timeCreated: '2026-08-20T00:00:00.000Z',
      contentType: 'application/x-tar',
      metadata: {},
    };
    (fetch as unknown as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({ items: [item] }),
    });
    const storage = new GcpStorage('bvm.bit.dev');

    await expect(storage.getFiles({ prefix: 'versions/dev/linux/' })).resolves.toEqual([item]);
  });

  it('uploads a file with a PUT request signed by the HMAC keys', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => '"etag-value"' },
    });
    const storage = GcpStorage.create('bvm.bit.dev', {}, 'access-key', 'secret-key');

    await expect(storage.putFile('index.json', '{}', { 'Content-Type': 'application/json' })).resolves.toEqual({
      etag: '"etag-value"',
    });
    const [url, options] = (fetch as unknown as jest.Mock).mock.calls.at(-1);
    expect(url).toBe('https://storage.googleapis.com/bvm.bit.dev/index.json');
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=access-key\/\d{8}\/auto\/s3\/aws4_request/);
  });

  it('throws when the HMAC keys are missing', async () => {
    const storage = new GcpStorage('bvm.bit.dev');

    await expect(storage.putFile('index.json', '{}')).rejects.toThrow('accessKey and secretKey are required');
  });
});
