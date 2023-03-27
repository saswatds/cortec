# @cortec/core

The corec core is the main module that loads all the various modules that you may use in your application. 

```typescript
import Cortec from '@cortec/core';
import pkg from './package.json';

const cortec = new Cortec(pkg);

// Use a single module
cortec.use(new Module1());

// Use miltiple modules
cortec.use(new Module1(), new Module2());


// Load all the modules
const dispose = await cortec.load();

```

## API

* `use(module: Module): void` - the `use` method can be used to register various modules. Corec will load the modules in the order they were registered. 

* `load(): Promise<dispose>` - the `load` method can be used to load all the modules. This method returns a `dispose` function which can be used to stop all modules and clean up the application for graceful exit.

## Configuration

Configuration for various environment is one crucial component of any production grade service.
Because all modules need some kind of configuration. Cortec come with the `@cortec/config` modules
that provides the configuration capability for all other modules to use. It is a required module.

If you wish to use your own, you can implement you own with the IConfig interface and override the
existing config module