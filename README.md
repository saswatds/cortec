# Cortec (BETA)

# **The public API is still under-development and will change**

A opinionated ecosystem of modules and adapters for building production ready backend service with typescript quickly.

## Why?

Building backend services built with NodeJS typically involves defining endpoints, connecting to services like databases, cache and queue, and communicating with other services over HTTP, websocket, etc. A lot of frameworks like Express, Koa, Fastify, etc. provide a way to define endpoints and middleware. However, there is no standard way to load, unload and expose all the various modules, and developers have to write a lot of boilerplate code to connect to these services.


## Core Principles

* **Typescript First**: Cortec is built with typescript natively and should work out of the box with any typescript project.
* **Dependency Injection**: Cortec uses dependency injection to load and unload modules. This allows modules to be loaded in any order and unloaded in reverse order.
* **Opinionated**: Cortec is opinionated and provides a set of modules that are commonly used in backend services. However, developers can choose to use any module of their choice.
* **Production Ready**: Cortec is built with production in mind.
* **Extensible**: Cortec is extensible and allows developers to write their own modules and adapters.


## Getting Started

Get started by installing the core, polka, and the server modules.

```bash
npm i @cortec/core @cortec/polka @cortec/server
```

1. Create a file `index.ts` and initialize the core module.

```typescript
import Cortec from '@cortec/core';
import Polka from '@cortec/polka';
import Server from '@cortec/server';

import { Router } from './router'; // Define your router

// Create a new cortec instance
// The name and version are used to identify the application (package.json)
const cortec = new Cortec({
  name: 'test',
  version: '1.0.0'
});


const polka = new Polka(Router); // Register the polka module with the router
const server = new Server(polka.name); // Register the server module with the name of the polka module

// Register the modules with the cortec instance
cortec.use(polka);
cortec.use(server);

// Load the modules and wait for everything to be ready
cortec
  .load()
  .then(() => {
    // Emit a ready signal to the process for the parent process to know that the application is ready
    // If you are using pm2 then you can use the `pm2 start --wait-ready` command to wait for the ready signal
    process.send?.('ready');
  });
```

2. Then create the `config/default.yml` file with the following content.

```yaml
server:
  http:
    port: 8080
```

3. Finally, create the `router.ts` file with the following content.

```typescript
import type { IRouter } from '@cortec/polka';
import { Response, route } from '@cortec/polka';

// Building the root route
const Root = route({

  // Implement the on request handler that will be called every time a request is made to the route
  async onRequest () {

    // Return a json response
    return Response.json({
      message: 'Hello World!',
    });
  },
});

// Define the router function that will be passed to the polka module
export const Router: IRouter = (app) => {
  app.get('/', Root);
};

```

Now you can run the application using `ts-node`.

```bash
ts-node index.ts
```

and test the application using curl.

```bash
curl http://localhost:8080
```


## Module Documentation

### Core
The core module is a dependency injection container and module loader.

```bash
npm i @cortec/core
```

Cortec core needs to be initialized with the `name` and `version` of the application.
The core also handles the `SIGTERM`, `SIGINT` and `uncaughtException` to safely shutdown
the application.

#### API

* `use(module: IModule): void`

  The `use` method can be used to register a module core container. If two modules having same name are registered then the later will replace the previous but the loader order will remain unchanged.

* `load(): Promise<void>`

  The load method asynchronously loads all the modules in the order they were registered and returns a promise.


### Polka

#### Authentication
The authentication module can be used to handle how the endpoint is protected.
The function when resolves with a promise, should return a session that can be accessed using the, `req.session` property.



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