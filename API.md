# API Reference

Technical specification of the public API of `@domain-first/handlers-next`.

- [Package](#package)
- [Exports overview](#exports-overview)
- [Adapter](#adapter)
    - [`nextAdapter`](#nextadapter)
    - [Request reading](#request-reading)
    - [Response writing](#response-writing)
- [Functions](#functions)
    - [`nextEndpoints`](#nextendpoints)
- [Types](#types)
    - [`NextRouteContext`](#nextroutecontext)
- [Runtime semantics](#runtime-semantics)
    - [Route matching](#route-matching)

Notation used below:

- **Endpoint** is a function built with `createEndpoint()(nextAdapter)` from [`@domain-first/handlers-rest`](https://www.npmjs.com/package/@domain-first/handlers-rest). It has the signature `(request: NextRequest, context?: NextRouteContext) => Promise<NextResponse>` and carries its `metadata` (method and path) and `_api_schemas`.
- **Route path** is `metadata.route.path`, for example `["users", ":userId"]`. Segments prefixed with `:` are **path parameters**; all other segments are **static**.
- **Request path** is the array of segments Next.js passes to a catch-all route as `params.path`.

## Package

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| Name         | `@domain-first/handlers-next`                                 |
| Entry point  | `.` (single entry, no subpath exports)                        |
| Formats      | ESM (`dist/index.js`), CommonJS (`dist/index.cjs`)            |
| Types        | `dist/index.d.ts`                                             |
| Dependencies | None                                                          |
| Peer         | `next` `>=13 <17` (App Router)                                |
| Works with   | `@domain-first/handlers-rest` (its `Adapter` type)            |
| Syntax       | ES syntax supported by Node.js 22                             |

## Exports overview

| Export             | Kind     | Section                                   |
| ------------------ | -------- | ----------------------------------------- |
| `nextAdapter`      | constant | [`nextAdapter`](#nextadapter)             |
| `nextEndpoints`    | function | [`nextEndpoints`](#nextendpoints)         |
| `NextRouteContext` | type     | [`NextRouteContext`](#nextroutecontext)   |

Nothing else is part of the public API.

## Adapter

### `nextAdapter`

Adapter for `@domain-first/handlers-rest` that turns endpoints into App Router route handlers.

**Signature**

```ts
const nextAdapter: Adapter<
    [request: NextRequest, context?: NextRouteContext],
    NextResponse
>;
```

**Behavior**

- Endpoints built with it accept exactly the arguments Next.js passes to a route handler, so they can be exported from `route.ts` as `GET`, `POST`, … directly.
- Implements every `Adapter` member, including the optional `input.pathParams`, so routes with path parameters are supported.
- A plain object, not a factory: it has no configuration.

**Example**

```ts
import { createEndpoint } from "@domain-first/handlers-rest";
import { nextAdapter } from "@domain-first/handlers-next";

const nextEndpoint = createEndpoint()(nextAdapter);

// app/api/sum/route.ts
export const POST = nextEndpoint(sum, { route: { method: "post", path: ["sum"] } })
    .input((schema) => ({ body: schema }))
    .mapInput(({ body }) => body);
```

### Request reading

How each request part is obtained from `request: NextRequest` and `context?: NextRouteContext`. When a part is read at all is decided by `@domain-first/handlers-rest`: `query`, `headers` and `cookies` are always read, `body` and `formData` only when the endpoint declares a schema for them, `params` only when the route path has parameters.

| Part       | Source                                        | Result                                                                                  |
| ---------- | --------------------------------------------- | --------------------------------------------------------------------------------------- |
| `query`    | `request.nextUrl.searchParams`                | `Record<string, string>`. For a repeated key the last value wins.                       |
| `params`   | `await context?.params`                       | The object Next.js resolved, or `{}` when `context` or `context.params` is missing.     |
| `body`     | `request.json()`                              | Parsed JSON.                                                                            |
| `formData` | `request.formData()`                          | A `FormData` instance.                                                                  |
| `headers`  | `request.headers`                             | `Record<string, string>`. Names are lowercase; repeated headers are joined with `", "`. |
| `cookies`  | `request.cookies.getAll()`                    | `Record<string, string>` of cookie names to values. For a repeated name the last wins.  |

**Throws**

| Error                    | When                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Whatever `json()` throws | A body schema is declared and the body is empty or not valid JSON.                    |
| Whatever `formData()` throws | A form data schema is declared and the body is not form data.                     |

How these errors become a response is decided by `@domain-first/handlers-rest`.

A missing path parameter (for example, an endpoint with `:userId` exported from a folder without `[userId]`) is not an adapter error: `params` is `{}` and path parameter validation in `@domain-first/handlers-rest` fails.

### Response writing

How the result of an endpoint becomes a response.

**On success**

1. If the result has `cookies`, every entry is set with `cookies().set(name, value, options)` from `next/headers`. See [Cookies](#cookies).
2. Returns a `Response` with:

| Part      | Value                                                                                    |
| --------- | ---------------------------------------------------------------------------------------- |
| Status    | `statusCode` (the endpoint's success status code)                                        |
| Body      | `JSON.stringify(body)`. Empty when `body` is `undefined`.                                |
| Headers   | `Content-Type: application/json`, then the result's `headers`. A `Content-Type` header in the result overrides the default. |

**On failure**

Returns a `Response` with status `statusCode`, body `JSON.stringify(error)` and `Content-Type: application/json`. Cookies and headers are not written.

#### Cookies

| Cookie options from the second argument of `.output()` (`{ cookies: { [name]: … } }`) | Options passed to `cookies().set()` |
| ------------------------------------------------- | ----------------------------------- |
| Present                                           | `{ maxAge, httpOnly }`              |
| Absent                                            | None (Next.js defaults)             |

- Only `maxAge` and `httpOnly` are forwarded. `path`, `domain`, `secure`, `sameSite` and `expires` keep Next.js defaults.
- `cookies()` works only inside a Next.js request scope. Calling an endpoint that sets cookies outside of it (for example, in a unit test without Next.js) throws.

**Returns**

A plain `Response`, typed as `NextResponse`. It is not a `NextResponse` instance: `NextResponse`-only members such as `response.cookies` are not available at runtime.

## Functions

### `nextEndpoints`

Combines endpoints into one catch-all route handler.

**Signature**

```ts
function nextEndpoints(
    routes: Array<Endpoint>
): (
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) => Promise<NextResponse>;
```

`Endpoint` is any endpoint built with `@domain-first/handlers-rest`: a function with `metadata` and `_api_schemas`. It is not exported as a named type.

**Parameters**

| Name     | Type              | Description                                                         |
| -------- | ----------------- | ------------------------------------------------------------------- |
| `routes` | `Array<Endpoint>` | Endpoints to dispatch to. Order does not affect matching except for ties. |

**Returns**

A route handler for a catch-all segment named `path`: `app/<prefix>/[...path]/route.ts`. Export it under every HTTP method the endpoints use.

**Behavior**

1. Awaits `context.params` and reads `path`.
2. Selects the endpoint by method and path. See [Route matching](#route-matching).
3. No endpoint matches: returns a `Response` with status `404` and an empty body.
4. Otherwise calls the endpoint with `request` and `{ params: Promise.resolve(pathParams) }`, and returns its response.

- Route paths are relative to the catch-all folder: for `app/api/[...path]/route.ts`, `GET /api/users/42` has the request path `["users", "42"]` and matches `["users", ":userId"]`, not `["api", "users", ":userId"]`.
- `routes` is read on every request: the array is not copied or pre-processed.

**Throws**

| Error                  | When                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `TypeError`            | `params.path` is `undefined`: the folder is an optional catch-all `[[...path]]` hit without segments, or the segment is not named `path`. |
| Whatever the endpoint throws | The matched endpoint rejects.                                                          |

**Example**

```ts
// app/api/[...path]/route.ts
import { nextEndpoints } from "@domain-first/handlers-next";

const handler = nextEndpoints([getUser, getMe, createUser]);

export const GET = handler;
export const POST = handler;
```

## Types

### `NextRouteContext`

The second argument Next.js passes to App Router route handlers, as endpoints built with [`nextAdapter`](#nextadapter) accept it.

```ts
type NextRouteContext = {
    params?: Promise<Record<string, string | string[] | undefined>>;
};
```

- `params` is a `Promise`, as in Next.js 15 and later.
- Values are taken as-is. A catch-all segment gives a `string[]`, which fails path parameter validation in `@domain-first/handlers-rest`: path parameters map to single dynamic segments `[name]`.

## Runtime semantics

| Topic                 | Behavior                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Direct export         | An endpoint is a route handler. Folder names of dynamic segments must equal the parameter names of the route path.        |
| Route path in direct export | Not matched against the URL: Next.js routing decides which file runs. The route path only names parameters and feeds OpenAPI. |
| Catch-all dispatch    | [`nextEndpoints`](#nextendpoints) matches method and route path itself. Next.js only supplies the segments.               |
| Unknown route         | `404` with an empty body. A known path with another method is also `404`, not `405`.                                      |
| `HEAD`, `OPTIONS`     | Not derived from `GET`. They match only endpoints declared with that method and exported under that name.                 |
| Response type         | Always a plain `Response` with a JSON content type.                                                                       |

### Route matching

[`nextEndpoints`](#nextendpoints) selects an endpoint with these rules:

| Step          | Rule                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Method        | `metadata.route.method` equals `request.method`, case-insensitively.                                                              |
| Segments      | Route path segments are split by `/`: `["users", "tabs/:tab"]` is the same as `["users", "tabs", ":tab"]`.                         |
| Length        | The route path and the request path have the same number of segments. There are no optional or wildcard parameters.              |
| Static        | A static segment equals the request segment exactly (case-sensitive).                                                            |
| Parameter     | A `:name` segment matches any request segment; its value is stored under `name`. If a name repeats, the last value wins.          |
| Specificity   | Among matches, at the first segment where two route paths differ in kind, the static one wins. Array order does not matter.      |
| Ties          | Route paths with the same kinds at every position (e.g. two identical paths): the earlier one in `routes` wins.                   |

**Example**

| Request path               | Routes                                           | Selected              |
| -------------------------- | ------------------------------------------------ | --------------------- |
| `["users", "me"]`          | `["users", ":userId"]`, `["users", "me"]`        | `["users", "me"]`     |
| `["users", "42"]`          | `["users", ":userId"]`, `["users", "me"]`        | `["users", ":userId"]` |
| `["users", "42", "posts"]` | `["users", ":userId", ":tab"]`, `["users", ":userId", "posts"]` | `["users", ":userId", "posts"]` |
| `["posts", "42"]`          | `["users", ":userId"]`                           | None: `404`           |
