# Domain-First Handlers (Next.js)

## Adapters

```ts
import { createEndpoint } from "@domain-first/handlers-rest";
import { nextAdapter } from "@domain-first/handlers-next";

const endpointGenerator = createEndpoint();
const nextEndpoint = endpointGenerator(nextAdapter);
```

## Endpoints

```ts
// app/api/[...path]/route.ts
import { nextEndpoints } from "@domain-first/handlers-next";

const routes = []; // <- routes

const handler = nextEndpoints(routes);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
```

## Path parameters

Segments prefixed with `:` in a route path are path parameters.

With `nextEndpoints`, they match any segment of the catch-all route, and their values are passed to the endpoint. Static segments always take priority over parameters, regardless of the order of routes: `/users/me` goes to `['users', 'me']`, not to `['users', ':userId']`.

Endpoints can also be exported directly from a dynamic route. Then folder names must match parameter names:

```ts
// app/api/users/[userId]/route.ts
export const GET = nextEndpoint(findUser, {
    route: { method: "get", path: ["users", ":userId"] },
})
    .input(() => ({}))
    .mapInput(({ params }) => ({ id: Number(params.userId) }));
```
