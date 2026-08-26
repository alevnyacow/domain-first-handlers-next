import type { Metadata, RawAPISchemas } from '@domain-first/handlers-rest';
import type { NextRequest, NextResponse } from 'next/server';

type Context = {
    params: Promise<{
        path: string[];
    }>;
};

export const nextEndpoints = (
    routes: Array<
        { metadata: Metadata; _api_schemas: RawAPISchemas } & Function
    >
) => {
    return async (
        request: NextRequest,
        { params }: Context
    ): Promise<NextResponse> => {
        const { path } = await params;

        const route = routes.find(({ metadata }) => {
            return (
                metadata.route.method.toLowerCase() ===
                    request.method.toLowerCase() &&
                metadata.route.path.length === path.length &&
                metadata.route.path.every(
                    (segment, index) => segment === path[index]
                )
            );
        });

        if (!route) {
            return new Response(undefined, { status: 404 }) as NextResponse;
        }

        return route(request) as Promise<NextResponse>;
    };
};
