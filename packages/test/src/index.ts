import Cortec from '@cortec/core';
import MongoDB from '@cortec/mongodb';
import Polka from '@cortec/polka';
import Redis from '@cortec/redis';
import Server from '@cortec/server';

import { Router } from './api/router.js';

const cortec = new Cortec({
  name: 'test',
  version: '1.0.0',
  silent: false,
  printOpenHandles: true,
});
const polka = new Polka(Router);
const server = new Server(polka.name);
const redis = new Redis();
const mongodb = new MongoDB();

cortec.use(redis);
cortec.use(mongodb);
cortec.use(polka);
cortec.use(server);

cortec.load().then(() => {
  process.send?.('ready');
});
