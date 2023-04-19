# TypeBeam

TypeBeam is a backend framework for building scalable, maintainable,
and secure TypeScript applications. It is designed to provide a streamlined
and intuitive developer experience, while still being flexible enough
to handle a wide range of use cases.

It has been built with the main focus on creating minimal code to be as
expressive as possible. The best DX we could imagine. While making most
use of TypeScript type-inference to do the heavy lifting. Removing the need
for boilerplate inherent in other popular "enterprise" backend frameworks.

It also aims to be dependency-free. With no dependencies, the framework can
be easier to audit, and it reduces the attack surface of the application.
You also have the flexibility to plug in components as required. You can
bring your own ORM, or (as will be explained in the docs) prefer no ORM.
Use Zod for validation, or provide your own. Plug in any third-party authentication
provider, or roll yor own. Use CASL for authorisation, or use your own.

It's also part of the TypeBeam philosophy to not need a CLI. A CLI would
be useful to scaffold out parts of an application when a framework
requires lots of boilerplate. But TypeBeam aims to not need this because
we want to avoid needing lots of boilerplate.

## Why?

Express and Nest.js are great options for building backends for Node.js.

Express is great because it's the most popular, battle-tested, and with an
extensive ecosystem of middleware and extensions. 
Express is currently the most commonly used backend library for Node.js. 
Although it is not technically a framework, it is surrounded by an extensive ecosystem. 
While it is still a practical choice, it may not feel like a modern option for TypeScript 
development. 

On the other hand, Nest.js is often described as an "enterprisey" solution 
due to its support for a decoupled modular architecture and its use of TypeScript. 
However, it does not fully take advantage of type inference to improve development experience, 
resulting in code that can feel overly complex and repetitive.

If you're looking for a backend Node.js library that makes use of TypeScript in a way that
improves developer experience, without excessive boilerplate, then give TypeBeam a
try.

## License

TypeBeam is licensed under the MIT License. 
Feel free to use it for your personal or commercial projects.

## Installation

TypeBeam can be installed using npm or yarn:

```shell
npm install typebeam
```

## Vanilla Startup

To get started with TypeBeam, just create a new npm project, install
a few dev dependencies required to work with TypeScript, and then install
TypeBeam:

```shell
mkdir my-project
cd my-project
npm init -y
npm i -D typescript ts-node nodemon
npm i typebeam @tsconfig/node18-strictest-esm
```

Update `package.json` to include `"type": "module"`.

Configure TypeScript with a `tsconfig.json` file:

```json
{
  "extends": "@tsconfig/node18-strictest-esm/tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"],
  "compilerOptions": {
    "outDir": "dist"
  }
}
```

Create a `main.ts` file:

```typescript
import { ServerBuilder } from "typebeam";

const app = new ServerBuilder()
app.get('/health-check').handle(() => ({ message: "OK!" }));

const server = await app.build();
await server.listen();
```

Add the following npm script to your package.json to start the server:

```json
{
  "scripts": {
    "dev": "nodemon -w *.ts -e ts -x node --experimental-specifier-resolution=node --loader ts-node/esm ./src/main.ts"
  }
}
```

Then start your server with:

```shell
npm run dev
```

Now open http://localhost:3000/health-check in a browser to see your API response.

## High-level overview

Create a server builder and configure it. Provide config to constructor. The inferred type
is used when passing this config to providers and handlers. A kind of dependency injection
is used that allows decoupling global and request-scoped providers. If used effectively, this
can simplify the architecture, and make testing easier. More about that in later sections of
the documentation. 

Use `context()` to add global providers,
and use `provide()` to add request-scoped providers.

Context and provide methods should be chained together as TypeScript type inference
is then used to build up a full type definition of the ServerBuilder. All global
and request-scoped injection later on will use the types inferred at this early stage
of configuration of the ServerBuilder.

Add routes to the server builder, and configure routes, providing a route handler.
Each route is added by calling one of the HTTP verbs on the server builder. This returns
a RouteBuilder to which various methods calls can be chained, again taking advantage of
TypeScript type inference to build up the appropriate types, which are then available
for injection into the route handler.

Finally, after defining all routes, the server is built, and you call `listen()` to start
accepting incoming requests.

## Examples [WIP]

Hopefully the high-level overview made some sense. But it might be better to get an idea
of how TypeBeam is used by looking at some examples. 

First a simple hello world that demonstrates how to configure a route with a single
query parameter, and return a basic JSON response.

A more fully-fledged CRUD app, but with data stored in memory so no persistence. 
Not very useful, as all the data is reset every time the service restarts, but demonstrates
how to use a few more of the TypeBeam features.

A more real world example uses Postgres for persistence, Firebase for authentication, 
and demonstrates features such as access control, database migrations (with ley) 
and configuration from environment variables. There's a full tutorial walkthrough 
that demonstrates this setup.

## Routes

To add routes to an application, you call the functions provided on the ServerBuilder named
after the HTTP verb you require. GET requests are recommended for fetching data, and POST
requests are recommended for anything that modifies data or causes a state change.
The response from `get()` or `post()` returns a RouteBuilder which you use to further refine
the route definition, most of this is optional, except you must follow up with a route handler
callback. This is added by calling `handle()` on the route builder. For example:

```typescript
app.get('/api/v1/todo').handle(() => []); // TODO: return list of TODOs

app.post('/api/v1/todo').handle(() => ({})); // TODO: create new TODO!
```

You can also use other HTTP verbs:

```typescript
app.get()
app.post()
app.delete()
app.put()
app.patch()
```

After calling the HTTP verb you have a route builder. This you can chain any of these methods:

```
.query()    // define query params
.body()     // define body schema 
.inject()   // which request-scoped providers to inject
.guard()    // perform authorisation check
.handle()   // REQUIRED - define the route handler
```

These methods are chained off the HTTP verb from the server builder. 

### Query and Body validation

A callback is provided to either `.query()` or `.body()` that will be used to validate
the query string parameters or request body. TypeScript type inference is leveraged to 
take the return type from the validation function, and use this to then type the appropriate
parameter for the handler callback. Here is an example making use of Zod for the 
query string validation:

```typescript
app
  .get('/hello')
  .query(z.object({ name: z.string() }).parse)
  .handle(({ query: { name }}) => ({ message: `Hello, ${name}!`}));
```

Or perhaps using Zod to validate a POST request body:

```typescript
app
  .post('/create')
  .body(z.object({ title: z.string() }).parse)
  .handle(({ body: { title }}) => {
    // TODO: use `title` to create something
  })
```

You can specify parameters in the URL too. These are all inferred to be of string type,
but you could always coerce them as needed. Any path part prefixed with a `:` will be 
extracted from the URL and passed to the handler as a param. Some TypeScript magic
(that you can read about here) is used to infer the shape of the param object passed to 
the handler function:

```typescript
app
  .put('/update/:id')
  .body(z.object({ title: z.string() }).parse)
  .handle(({ params: { id }, body: { title }}) => {
    // TODO: use `title` to update item identified by `id`
  })
```

### HTTP response codes

Success will return HTTP status 200 by default, except in the case of POST where it defaults
to 201. If you want to override this use `.httpCode()` as part of the route builder chain.
For example, to return a 200 OK instead of 201 Created from a POST:

```typescript
app.post('do-something').httpCode(200).handle(() => /* TODO */)
```

or maybe a 202 Accepted if you have queued something for async processing:

```typescript
app.post('queue').httpCode(202).handle(() => /* TODO */)
```

