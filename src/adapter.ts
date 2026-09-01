import type { Adapter } from '@domain-first/handlers-rest';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * Plain `jsonResponse` working without NextResponse extension.
 *
 * @param data response data
 * @param init response initialization
 * @returns Response object can be sent to a client
 */
function jsonResponse<T>(data: T, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {})
        }
    }) as any;
}

export const nextAdapter: Adapter<[request: NextRequest], NextResponse> = {
    input: {
        body: (x) => x.json(),
        queryParams: (x) =>
            Object.fromEntries(x.nextUrl.searchParams.entries()),
        cookies: (x) =>
            x.cookies.getAll().reduce(
                (acc, cur) => {
                    acc[cur.name] = cur.value;
                    return acc;
                },
                {} as Record<string, string>
            ),
        formData: (x) => x.formData(),
        headers: (x) => Object.fromEntries(x.headers.entries())
    },
    output: async (x) => {
        if (x.success) {
            if (x.cookies) {
                const cookiesProvider = await cookies();
                const cookiesConfiguration = x.configuration?.cookies ?? {};
                for (const cookie of Object.entries(x.cookies)) {
                    const cookieConfig = cookiesConfiguration[cookie[0]];
                    cookiesProvider.set(
                        cookie[0],
                        cookie[1],
                        cookieConfig
                            ? {
                                  maxAge: cookieConfig.maxAge,
                                  httpOnly: cookieConfig.httpOnly
                              }
                            : undefined
                    );
                }
            }

            return jsonResponse(x.body, {
                headers: x.headers ?? {},
                status: x.statusCode
            });
        }

        return jsonResponse(x.error, { status: x.statusCode });
    }
};
