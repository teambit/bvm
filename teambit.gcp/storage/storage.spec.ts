import fetch from 'node-fetch';
import { GcpStorage } from './storage';

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
});
