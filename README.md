# Domain First Handlers (Next.js)

<p>
    <img src="https://img.shields.io/npm/v/%40domain-first%2Fhandlers-next" alt="version">
    <img src="https://img.shields.io/badge/TypeScript-ready-3178C6?logo=typescript&logoColor=white?style=for-the-badge" alt="TypeScript ready">
    <img src="https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release" alt="semver">
    <img src="https://img.shields.io/npm/l/%40domain-first%2Fhandlers-next" alt="license">
</p>

Domain handlers as Next.js App Router route handlers.

## What is it?

[`@domain-first/handlers-rest`](https://www.npmjs.com/package/@domain-first/handlers-rest) describes how HTTP reaches your business logic: which request parts to validate and how to map them to a handler. It doesn't know about any framework: an adapter connects it to one.

Domain First Handlers (Next.js) is **the adapter for the App Router**. Endpoints built with it are route handlers: export them from `route.ts` directly, or put them all behind one catch-all route with `nextEndpoints`, which matches methods and paths, path parameters included.

```
npm i @domain-first/handlers-next @domain-first/handlers-rest
```

## API

The full technical specification lives in [API.md](./API.md).

## Guide

### How to create endpoints

Pass `nextAdapter` to the endpoint generator.

```ts
import { createEndpoint } from "@domain-first/handlers-rest";
import { nextAdapter } from "@domain-first/handlers-next";

const nextEndpoint = createEndpoint()(nextAdapter);
```

### How to serve all endpoints from one route

Create a catch-all route named `[...path]` and pass the endpoints to `nextEndpoints`. Route paths are relative to the catch-all folder.

```ts
// app/api/[...path]/route.ts
import { nextEndpoints } from "@domain-first/handlers-next";

const handler = nextEndpoints([findUser, findMe, createUser]);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
```

Unknown routes get `404`. Static segments always take priority over parameters, regardless of the order of endpoints: `/api/users/me` goes to `["users", "me"]`, not to `["users", ":userId"]`.

## License

MIT
