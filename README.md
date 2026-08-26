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
