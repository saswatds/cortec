import Axios from '@cortec/axios';
import Cortec from '@cortec/core';
import DynamicConfig from '@cortec/dynamic-config';
import MongoDB from '@cortec/mongodb';
import Newrelic from '@cortec/newrelic';
import Polka from '@cortec/polka';
import RabbitMQ from '@cortec/rabbitmq';
import Redis from '@cortec/redis';
import Sentry from '@cortec/sentry';
import Server from '@cortec/server';

import { importantConfig, Router } from './api/router';

const cortec = new Cortec({
  name: 'test',
  version: '1.0.0',
  silent: false,
  printOpenHandles: true,
});
const newrelic = new Newrelic();
const polka = new Polka(Router);
const server = new Server(polka.name);
const redis = new Redis();
const mongodb = new MongoDB();
const dc = new DynamicConfig(importantConfig);
const sentry = new Sentry();
const axios = new Axios(['echo']);
const rabbitmq = new RabbitMQ();

cortec.use(newrelic);
cortec.use(sentry);
cortec.use(redis);
cortec.use(mongodb);
cortec.use(rabbitmq);
cortec.use(dc);
cortec.use(axios);
cortec.use(polka);
cortec.use(server);

cortec.load().then(() => {
  process.send?.('ready');

  const count = 0;
  // Every 1 minute, refresh the dynamic config
  setInterval(() => {
    dc.update({ abc: 'count+' + count }).catch(console.error);
  }, 60000);

  const channel = rabbitmq.channel('primary');
  // Subscribe to the 'test' queue
  channel.consume('test', 10, async (msg: string) => {
    console.log(msg);
  });
});
