import type * as nodefs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';

import type { ReadStream, Stats } from 'fs-extra';
import {
  createReadStream,
  createWriteStream,
  mkdirpSync,
  outputFile,
  pathExists,
  readdir,
  readFile,
  remove,
  stat,
} from 'fs-extra';

export interface IBaseStorage {
  readdir(dir: string): Promise<string[]>;
  read(file: string): Promise<string>;
  readStream(file: string): nodefs.ReadStream;
  write(file: string, content: string): Promise<void>;
  writeStream(file: string, stream: Readable): Promise<void>;
  has(file: string): Promise<boolean>;
  stat(file: string): Promise<Stats>;
  scope(path: string): IBaseStorage;
  dispose(): Promise<void>;
  delete(fileOrDirectory: string): Promise<void>;
}

export class DiskStorage implements IBaseStorage {
  private basePath: string;
  constructor(basePath: string, makeParent: boolean) {
    this.basePath = basePath;
    makeParent && mkdirpSync(this.basePath);
  }

  async readdir(dir: string): Promise<string[]> {
    return readdir(path.join(this.basePath, dir));
  }

  async read(file: string): Promise<string> {
    return (await readFile(path.join(this.basePath, file))).toString('utf8');
  }

  readStream(file: string): ReadStream {
    const filePath = path.join(this.basePath, file);
    return createReadStream(filePath);
  }

  async write(file: string, content: string) {
    return outputFile(path.join(this.basePath, file), content);
  }

  async writeStream(file: string, stream: Readable) {
    const filePath = path.join(this.basePath, file);
    mkdirpSync(path.dirname(filePath));
    const writeStream = createWriteStream(filePath);
    stream.pipe(writeStream);

    return new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    });
  }

  async has(file: string): Promise<boolean> {
    return pathExists(path.join(this.basePath, file));
  }

  async stat(file: string): Promise<Stats> {
    return stat(path.join(this.basePath, file));
  }

  scope(basePath: string): IBaseStorage {
    return new DiskStorage(path.join(this.basePath, basePath), false);
  }

  async delete(fileOrDirectory: string) {
    return remove(path.join(this.basePath, fileOrDirectory));
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
