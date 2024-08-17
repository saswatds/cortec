import Cortec from '@cortec/core';
import Storage from '@cortec/storage';
import fs from 'fs';

const cortec = new Cortec({
  name: 'test',
  version: '1.0.0',
  silent: true,
  printOpenHandles: true,
});

const storage = new Storage();
cortec.use(storage);

describe('Storage', () => {
  beforeAll(async () => cortec.load());
  beforeEach(async () => fs.promises.mkdir('./.storage', { recursive: true }));
  afterEach(async () => fs.promises.rm('./.storage', { recursive: true }));

  it('should store data', async () => {
    await storage.get('test').write('test.txt', 'test');
    expect(fs.existsSync('./.storage/test.txt')).toBe(true);
  });

  it('should read data', async () => {
    await storage.get('test').write('test.txt', 'test');
    const data = await storage.get('test').read('test.txt');
    expect(data).toBe('test');
  });

  it('should delete data', async () => {
    await storage.get('test').write('test.txt', 'test');
    await storage.get('test').delete('test.txt');
    expect(fs.existsSync('./.storage/test.txt')).toBe(false);
  });

  it('should be able to store file in a subdirectory', async () => {
    await storage.get('test').write('subdir/test.txt', 'test');
    expect(fs.existsSync('./.storage/subdir/test.txt')).toBe(true);
  });

  it('should be able to delete a subdirectory', async () => {
    await storage.get('test').write('subdir/test.txt', 'test');
    await storage.get('test').delete('subdir');
    expect(fs.existsSync('./.storage/subdir')).toBe(false);
  });

  it.only("should be able to delete a subdirectory that doesn't exist", async () => {
    await storage.get('test').delete('subdir');
    expect(fs.existsSync('./.storage')).toBe(true);
  });
});
