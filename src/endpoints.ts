import type { Metadata, RawAPISchemas } from '@domain-first/handlers-rest';
import type { NextRequest, NextResponse } from 'next/server';
import type { NextRouteContext } from './adapter';

type Context = {
    params: Promise<{
        path: string[];
    }>;
};

type Route = { metadata: Metadata; _api_schemas: RawAPISchemas } & Function;

/**
 * Matches request path against route path. Route segments
 * prefixed with `:` are path parameters and match any segment.
 *
 * @param routePath route path, e.g. `['users', ':userId']`
 * @param path request path segments
 * @returns path parameters if path matches, `undefined` otherwise
 */
function matchPath(
    routePath: readonly string[],
    path: string[]
): Record<string, string> | undefined {
    const segments = routePath.flatMap((segment) => segment.split('/'));

    if (segments.length !== path.length) {
        return undefined;
    }

    const params: Record<string, string> = {};

    for (const [index, segment] of segments.entries()) {
        if (segment.startsWith(':')) {
            params[segment.slice(1)] = path[index];
        } else if (segment !== path[index]) {
            return undefined;
        }
    }

    return params;
}

/**
 * Compares route paths by specificity: at the first segment
 * where they differ, a static segment wins over a parameter.
 *
 * @returns negative if `a` is more specific, positive if `b` is, 0 if equal
 */
function compareSpecificity(a: readonly string[], b: readonly string[]) {
    const isParam = (path: readonly string[]) =>
        path
            .flatMap((segment) => segment.split('/'))
            .map((segment) => segment.startsWith(':'));
    const aParams = isParam(a);
    const bParams = isParam(b);

    for (const [index, aParam] of aParams.entries()) {
        if (aParam !== bParams[index]) {
            return aParam ? 1 : -1;
        }
    }

    return 0;
}

export const nextEndpoints = (routes: Array<Route>) => {
    return async (
        request: NextRequest,
        { params }: Context
    ): Promise<NextResponse> => {
        const { path } = await params;

        let match: { route: Route; params: Record<string, string> } | undefined;

        for (const route of routes) {
            if (
                route.metadata.route.method.toLowerCase() !==
                request.method.toLowerCase()
            ) {
                continue;
            }

            const pathParams = matchPath(route.metadata.route.path, path);

            if (
                pathParams &&
                (!match ||
                    compareSpecificity(
                        route.metadata.route.path,
                        match.route.metadata.route.path
                    ) < 0)
            ) {
                match = { route, params: pathParams };
            }
        }

        if (!match) {
            return new Response(undefined, { status: 404 }) as NextResponse;
        }

        const context: NextRouteContext = {
            params: Promise.resolve(match.params)
        };
        return match.route(request, context) as Promise<NextResponse>;
    };
};
