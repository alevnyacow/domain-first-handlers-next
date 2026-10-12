import { defineHandler } from '@domain-first/handlers';
import { createEndpoint } from '@domain-first/handlers-rest';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { expect, test } from '@rstest/core';
import { NextRequest } from 'next/server';
import { nextAdapter, nextEndpoints } from '../src';

const anySchema = <T>(): StandardSchemaV1<T, T> => ({
    '~standard': {
        version: 1,
        vendor: 'test',
        validate: (value) => ({ value: value as T })
    }
});

const echo = defineHandler({
    inputSchema: anySchema<object>(),
    outputSchema: anySchema<object>(),
    handler: async (input) => input
});

const endpoint = createEndpoint()(nextAdapter);

const getUser = endpoint(echo, {
    route: { method: 'get', path: ['users', ':userId'] }
})
    .input(() => ({}))
    .mapInput(({ params }) => ({ userId: params.userId }));

const getUserTab = endpoint(echo, {
    route: { method: 'get', path: ['users', ':userId', 'tabs/:tab'] }
})
    .input(() => ({}))
    .mapInput(({ params }) => params);

const getMe = endpoint(echo, {
    route: { method: 'get', path: ['users', 'me'] }
})
    .input(() => ({}))
    .mapInput(() => ({ me: true }));

const getUserPosts = endpoint(echo, {
    route: { method: 'get', path: ['users', ':userId', 'posts'] }
})
    .input(() => ({}))
    .mapInput(({ params }) => ({ posts: params.userId }));

const request = (path: string) =>
    new NextRequest(new URL(path, 'http://localhost'));

const catchAll = (path: string[]) => ({
    params: Promise.resolve({ path })
});

test('route handler reads path parameters from Next context', async () => {
    const response = await getUser(request('/api/users/42'), {
        params: Promise.resolve({ userId: '42' })
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: '42' });
});

test('missing path parameter is a request parsing error', async () => {
    const response = await getUser(request('/api/users/42'));

    expect(response.status).not.toBe(200);
});

test('nextEndpoints extracts path parameters', async () => {
    const handler = nextEndpoints([getUser, getUserTab]);

    const user = await handler(
        request('/api/users/42'),
        catchAll(['users', '42'])
    );
    expect(await user.json()).toEqual({ userId: '42' });

    const tab = await handler(
        request('/api/users/42/tabs/posts'),
        catchAll(['users', '42', 'tabs', 'posts'])
    );
    expect(await tab.json()).toEqual({ userId: '42', tab: 'posts' });
});

test('nextEndpoints returns 404 for unknown routes', async () => {
    const handler = nextEndpoints([getUser, getUserTab]);

    const response = await handler(
        request('/api/posts/42'),
        catchAll(['posts', '42'])
    );
    expect(response.status).toBe(404);

    const post = await handler(
        new NextRequest(new URL('/api/users/42', 'http://localhost'), {
            method: 'POST'
        }),
        catchAll(['users', '42'])
    );
    expect(post.status).toBe(404);
});

test('nextEndpoints prefers static segments over parameters', async () => {
    for (const routes of [
        [getUser, getUserTab, getMe, getUserPosts],
        [getUserPosts, getMe, getUserTab, getUser]
    ]) {
        const handler = nextEndpoints(routes);

        const me = await handler(
            request('/api/users/me'),
            catchAll(['users', 'me'])
        );
        expect(await me.json()).toEqual({ me: true });

        const user = await handler(
            request('/api/users/42'),
            catchAll(['users', '42'])
        );
        expect(await user.json()).toEqual({ userId: '42' });

        const posts = await handler(
            request('/api/users/42/tabs/posts'),
            catchAll(['users', '42', 'tabs', 'posts'])
        );
        expect(await posts.json()).toEqual({ userId: '42', tab: 'posts' });

        const userPosts = await handler(
            request('/api/users/42/posts'),
            catchAll(['users', '42', 'posts'])
        );
        expect(await userPosts.json()).toEqual({ posts: '42' });
    }
});
