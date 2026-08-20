import fetch from 'node-fetch';
import { GcpStorage, GcpStorageObject } from './storage';

jest.mock('node-fetch', () => jest.fn(), { virtual: true });

jest.mock('@teambit/toolbox.network.agent', () => ({
  getAgent: jest.fn(),
}), { virtual: true });

jest.mock('minio', () => ({
  Client: jest.fn(),
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
});
