import Axios from '@cortec/axios';
import Cortec from '@cortec/core';
import DynamicConfig from '@cortec/dynamic-config';
import MongoDB from '@cortec/mongodb';
import Newrelic from '@cortec/newrelic';
import Polka from '@cortec/polka';
import Postgres from '@cortec/postgres';
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
const postgres = new Postgres();

cortec.use(newrelic);
cortec.use(sentry);
cortec.use(redis);
cortec.use(mongodb);
cortec.use(postgres);
cortec.use(rabbitmq);
cortec.use(dc);
cortec.use(axios);
cortec.use(polka);
cortec.use(server);

cortec.load().then(async () => {
  process.send?.('ready');

  const count = 0;
  // Every 1 minute, refresh the dynamic config
  setInterval(() => {
    dc.update({ abc: 'count+' + count }).catch(console.error);
  }, 60000);

  const channel = rabbitmq.channel('primary');

  // Create test queue
  await channel.$channel?.assertQueue('test', { durable: true });

  channel.prefetch(10);

  // Subscribe to the 'test' queue
  channel.consume('test', async (msg: string) => {
    console.log(msg);
  });

  // Create a table if it doesn't exist in postgres
  await postgres
    .db('test')
    .query(
      'CREATE TABLE IF NOT EXISTS test (id SERIAL PRIMARY KEY, name VARCHAR(255))'
    );

  // Add a row to the table
  await postgres
    .db('test')
    .query('INSERT INTO test (name) VALUES ($1)', ['test']);
});
