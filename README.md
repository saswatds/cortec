# Cortec (BETA)

# **The public API is still under-development and will change**

A opinionated ecosystem of modules and adapters for quickly building production ready backend services with typescript.

## Why?

Building backend services built with NodeJS typically involves defining endpoints, connecting to services like databases, cache and queue, and communicating with other services over HTTP, websocket, etc. A lot of frameworks like Express, Koa, Fastify, etc. provide a way to define endpoints and middleware. However, there is no standard way to load, unload and expose all the various modules, and developers have to write a lot of boilerplate code to connect to these services.


## Core Principles

* **Typescript First**: Cortec is built with typescript natively and should work out of the box with any typescript project.
* **Dependency Injection**: Cortec uses dependency injection to load and unload modules. This allows modules to be loaded in any order and unloaded in reverse order.
* **Opinionated**: Cortec is opinionated and provides a set of modules that are commonly used in backend services. However, developers can choose to use any module of their choice.
* **Production Ready**: Cortec is built with production in mind.
* **Extensible**: Cortec is extensible and allows developers to write their own modules and adapters.


## Getting Started

To build a simple server you will need the *core*, *polka* and *server* module. Let's start by installing these three modules using npm.

```bash
npm i @cortec/core @cortec/polka @cortec/server
```

Step 1: Create the `index.ts` file and initialize the core module.

```typescript
import Cortec from '@cortec/core';
import Polka from '@cortec/polka';
import Server from '@cortec/server';

// The http router in a separate file for modulatity sake
import { Router } from './router';

// This constructs a new cortec instance with a name and version
// The config is compatible with the schema of package.json
const cortec = new Cortec({
  name: 'test',
  version: '1.0.0'
});


// Constructing the polka router with our routing configuration
const polka = new Polka(Router);

// Constructing the server module with name of router module (!warn - will change in future)
const server = new Server(polka.name);

// Registering the modules to cortec to manage their lifecycle
cortec.use(polka);
cortec.use(server);

// Loads all modules and wait for all of them to be ready
cortec
  .load()
  .then(() => {
    // Emit a ready signal to the process for the parent process to
    // know that the application is ready
    // If you are using pm2 then you can use the
    // `pm2 start --wait-ready` command to wait for the ready signal
    process.send?.('ready');
  });
```

Step 2: Create the `config/default.yml` file with the following content.

```yaml
server:
  http:
    port: 8080

polka:
  bodyParser:
    json:
      limit: '100kb'
  helmet: {}
```

Step 3: Create the `router.ts` file with the following content.

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


## Modules

### Core
The core module is a module loader that implements a simple dependency injection container and manages the lifecycle of all the registered modules.

```bash
npm i @cortec/core
```

Cortec core requires two required properties `name` and `version` during construction. These two properties are used to identify the application and is made available to all registered modules.
For example, packaged `newrelic` and `sentry` modules use name and version to namespace and report errors accurately.

The configuration accepted by core is compatible with `package.json`, therefore you can directly pass the `package.json` file as the configuration, something like this:

```typescript
const pkg = require('./package.json');

// Passing in the package.json file as the configuration
const cortec = new Cortec(pkg);
```

Or manually pass them like this:
```typescript
const cortec = new Cortec({
  name: 'test',
  version: '1.0.0'
});
```

On construction, cortec is initialized with only the `config` module registered. For registering any other module, the `use` API needs to be used.
```typescript
cortec.use(<instance of the module>);
```

Finally, the `load` method must be called to load all the modules. It returns a promise that resolves when all the modules are loaded successfully.
```typescript
// Async-await based interface
await cortec.load();

// Promise based interface
cortec
  .load()
  .then(() => {})
```

The core also listens to the various `SIGTERM`, `SIGINT` and `uncaughtException` signals to disposes all the modules and safely shutdown
the application.

#### API

* `use(module: IModule): void`

  The `use` method can be used to register a module.
  *(Note: If two modules having same name are registered then the later will replace the previous but the loader order will remain unchanged)*

* `load(): Promise<void>`

  The load method asynchronously loads all the modules in the order they were registered and returns a promise that resolves when all the modules successfully load. The promise never rejects, but instead logs the error to the console and kills the process if there is an error.


### Config
By default the core modules also loads the `@cortec/config` module which as wrapper over `node-config`. The `config` module is used to load the configuration from the `config` directory. The `config` module is loaded first and is available to all the other modules without needing to explicitly registering it.


### Polka - @cortec/polka

The `polka` module extends the [polka](https://github.com/lukeed/polka) framework. The `polka` module is used to define the routes that are exposed by the application. The `polka` module is registered with the name `polka`.



#### Authentication
The authentication module can be used to handle how the endpoint is protected.
The function when resolves with a promise, should return a session that can be accessed using the, `req.session` property.


### Dynamic Config - @cortec/dynamic-config

The `dynamic-config` module is used to dynamically load the configuration from a remote source like a database or a remote service. The `dynamic-config` module is registered with the name `dynamic-config`.

> Currently only the `mongodb` module is supported for loading the configuration from a mongodb database.

#### Usage
```yaml
mongodb:
  myMongoDB:
    connection:
      host: "localhost"
      user: "root"
      password: null
      database: "test"

dynamic-config:
  source:
    type: 'mongodb'
    mongodb:
      name: 'myMongoDB'
      collection: 'config'
  default:
    myConfig: 'myConfigValue'
```


  ```typescript
  import DynamicConfig  from '@cortec/dynamic-config';
  import MongoDB from '@cortec/mongodb';
  import { z } from 'zod';

  // Create a schema for the configuration
  const schema = z.object({
    myConfig: z.string(),
  });

 // Create the mongodb module
  const mongodb = new MongoDB();
 // Create the dynamic config module with the scheme of the configuration
  const dynamicConfig = new DynamicConfig(schema);

  // 1. Register mongodb module first
  cortec.use(mongodb);

  // 2. Register dynamic config module after mongodb
  cortec.use(dynamicConfig);

  // 3. Load the modules
  await cortec.load();
  ```

#### API
* `config: T`

  The `config` property is used to access the configuration that is loaded by the `dynamic-config` module. The `config` property is a getter that returns the configuration object.

  ```typescript
  /**
   const schema = z.object({
      myConfig: z.string(),
   });

   type Schema  = z.infer<typeof schema>;
  */
  import { IDynamicConfig } from '@cortec/dynamic-config';

  // Usage in a route
  route({
    async onRequest(req, ctx) {
      const dc = this.require<IDynamicConfig<ImportantConfig>>('dynamic-config');
      return Response.text('Config' + dc.config.myConfig);
    },
  })
  ```

* `update(config: T, ttl?: number): Promise<void>`

  The `update` method is used to update the configuration from the source. The `update` method returns a promise that resolves when the configuration is updated. Optionally, the `ttl` parameter can be used to set the time to live for the configuration. The default time to live is 5 minutes.

  ```typescript
  /**
   const schema = z.object({
      myConfig: z.string(),
   });

   type Schema  = z.infer<typeof schema>;
  */

  import { IDynamicConfig } from '@cortec/dynamic-config';

  // Usage in a route
  route({
    async onRequest(req, ctx) {
      const dc = this.require<IDynamicConfig<ImportantConfig>>('dynamic-config');

      // Update the configuration. This will update the configuration in the database and all the modules that depend on the configuration will be updated in the next ttl
      await dc.update({ myConfig: 'newConfig' });
      return Response.text('Success');
    },
  })
  ```

* `refresh(): Promise<void>`

  The `refresh` method is used to refresh the configuration from the source. The `refresh` method returns a promise that resolves when the configuration is refreshed.

  > The `refresh` method is called automatically every `ttl` seconds. However, the `refresh` method can be called manually to refresh the configuration.

  ```typescript
  import { IDynamicConfig } from '@cortec/dynamic-config';

  // Usage in a route
  route({
    async onRequest(req, ctx) {
      const dc = this.require<IDynamicConfig<ImportantConfig>>('dynamic-config');

      // Refresh the configuration in the current module manually
      await dc.refresh();
      return Response.text('Success');
    },
  })
  ```

### RabbitMQ - @cortec/rabbitmq

The `rabbitmq` module is used to connect to a RabbitMQ server. The `rabbitmq` module is registered with the name `rabbitmq`.

#### Usage
```yaml
rabbitmq:
  primary:
    connection:
      protocol: "amqp"
      hostname: "localhost"
      port: 5672
      username: "root"
      password: "password"
```

```typescript
import RabbitMQ from '@cortec/rabbitmq';

const rabbitmq = new RabbitMQ();

cortec.use(rabbitmq);

await cortec.load();
```


### API
* `channel(name: string): Channel`

  The `channel` method is used to fetch a channel by identifier. The `channel` method returns the channel object.

  ```typescript
  import { IRabbitMQ } from '@cortec/rabbitmq';

  // Usage in a route
  route({
    async onRequest(req, ctx) {
      const rabbit = this.require<IRabbitMQ>('rabbitmq');

      // Refresh the configuration in the current module manually
      await rabbit.channel('primary').sendToQueue('myQueue', Buffer.from('Hello World!'));
      return Response.text('Success');
    },
  })
  ```

## Building a custom module

A module is a class that implements the `IModule` interface. The `IModule` interface has two methods `load` and `dispose` that are called when the module is loaded and unloaded respectively.

```typescript
import { IModule } from '@cortec/core';

export class MyModule implements IModule {
  // The name of the module
  public name = 'my-module';

  // The load method is called when the module is loaded
  public async load () {
    // Do something when the module is loaded
  }

  // The unload method is called when the module is unloaded
  public async dispose () {
    // Do something when the module is disposed
  }
}
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
