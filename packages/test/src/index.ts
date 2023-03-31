import Cortec from '@cortec/core';
import Newrelic from '@cortec/newrelic';
import Polka from '@cortec/polka';
import Server from '@cortec/server';

const cortec = new Cortec({ name: 'test', version: '1.0.0' });
const newrelic = new Newrelic();
const polka = new Polka();
const server = new Server(polka.name);

cortec.use(newrelic);
cortec.use(polka);
cortec.use(server);

cortec.load().then(() => {
  process.send?.('ready');
});
