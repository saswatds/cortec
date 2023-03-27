import Cortec from '@cortec/core';

const cortex = new Cortec({ name: 'test', version: '1.0.0' });
cortex.use({
  name: 'test',
  load: () => Promise.resolve(),
  dispose: () => Promise.resolve(),
});

cortex.load().then(() => {
  console.log('ready');
});
