# Cortec

A lightweight opinionated framework for building backend service in Node.js quickly.
Any backend service typically has the business logic, a connection to a database, cache and or queue.
Most web-frameworks make the web-server the hero of their application and little, but cortes gives
equal importance to all the various components. Using this approach developers can build various
kinds of backend applications.

Cortec implements adapters over popular database, cache, logging and apm clients, which are
implemented as IModules. The cortec core module is a dependency injection container
and loads all used modules in order. 

During the loading stage, database and cache connections are established, the application server routers are configured, and APMs are initialized.

## Getting Started

// TODO:

## Modules

### Core

```bash
npm i @cortec/core
```

The core module is a dependency injection container and module loader.
Cortec core needs to be initialized with the `name` and `version` of the application.
The core also handles the `SIGTERM`, `SIGINT` and `uncaughtException` to safely shutdown
the application.

#### API

* `use(module: IModule): void`
  
  The `use` method can be used to register a module core container. If two modules having same name are registered then the later will replace the previous but the loader order will remain unchanged.

* `load(): Promise<void>`
  
  The load method asynchronously loads all the modules in the order they were registered and returns a promise.

  Developers could wait on the load and emit a `ready` signal like `process.send?.('ready')`.

#### Example Usage

```
const cortec = new Cortec({ name: 'test', version: '1.0.0' });

cortec.use(<module>);

cortec.load().then(() => {
  process.send?.('ready');
});
```


### List

- [x] Config (@cortec/config)
- [x] Redis (@cortec/redis)
- [x] MongoDB (@cortec/mongodb)
- [x] Newrelic (@cortec/newrelic)
- [x] Sentry (@cortec/sentry)
- [x] BullMQ (@cortec/bullmq)
- [x] Axios (@cortec/axios)
- [x] Logger (@cortec/logger)
- [x] Server (@cortec/server)
- [x] Cassandra (@cortec/cassandra)
- [x] Polka (@cortec/polka) 