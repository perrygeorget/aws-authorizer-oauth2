'use strict';

const dataToDomain = require('../../../../src/lib/oauth2/model/dataToDomain.js');

describe('dataToDomain', () => {
    const unixtime = Math.ceil(new Date().getTime() / 1000);
    const date = new Date(unixtime * 1000);

    test('transformClient', () => {
        const item = {
            client_id: 'client-id-1',
            client_secret: 'client-secret-1',
            user_id: 'user-id-1',
            grants: [
                'password',
                'client_credentials',

            ],
            redirect_uris: [
                'http://www.1.uri.com',
                'http://www.2.uri.com',
            ],
        };

        const actual = dataToDomain.transformClient(item);
        const expected = {
            id: item.client_id,
            redirectUris: item.redirect_uris,
            grants: item.grants,
            user: {
                id: item.user_id,
            },
        };

        expect(actual).toEqual(expected);
    });

    describe('transformRefreshToken', () => {
        test('with expires', () => {
            const item = {
                refresh_token: 'refresh-token-1',
                refresh_token_expires_on: unixtime,
                scope: 'scope-refresh',
                client_id: 'client-id-1',
                user_id: 'user-id-1',
            };

            const actual = dataToDomain.transformRefreshToken(item);
            const expected = {
                refreshToken: item.refresh_token,
                refreshTokenExpiresAt: date,
                client: {
                    id: item.client_id,
                },
                user: {
                    id: item.user_id,
                },
                scope: item.scope,
            };

            expect(actual).toEqual(expected);
        });
        test('without expires', () => {
            const item = {
                refresh_token: 'refresh-token-1',
                scope: 'scope-refresh',
                client_id: 'client-id-1',
                user_id: 'user-id-1',
            };

            const actual = dataToDomain.transformRefreshToken(item);
            const expected = {
                refreshToken: item.refresh_token,
                client: {
                    id: item.client_id,
                },
                user: {
                    id: item.user_id,
                },
                scope: item.scope,
            };

            expect(actual).toEqual(expected);
        });
    });

    test('transformAccessToken', () => {
        const item = {
            access_token: 'access-token-1',
            access_token_expires_on: unixtime,
            scope: 'scope-access',
            client_id: 'client-id-1',
            user_id: 'user-id-1',
        };

        const actual = dataToDomain.transformAccessToken(item);
        const expected = {
            accessToken: item.access_token,
            accessTokenExpiresAt: date,
            client: {
                id: item.client_id,
            },
            user: {
                id: item.user_id,
            },
            scope: item.scope,
        };

        expect(actual).toEqual(expected);
    });

    test('transformCredentials', () => {
        const item = {
            id: 'user-id-1',
            username: 'username',
            password: 'mojibake',
        };

        const actual = dataToDomain.transformCredentials(item);
        const expected = {
            id: item.id,
            username: item.username,
        };

        expect(actual).toEqual(expected);
    });

    test('transformAuthorization', () => {
        const item = {
            code: 'code-1',
            code_expires_on: unixtime,
            redirect_uri: 'http://www.1.uri.com',
            scope: 'scope-code',
            client_id: 'client-id-1',
            user_id: 'user-id-1',
        };

        const actual = dataToDomain.transformAuthorization(item);
        const expected = {
            code: item.code,
            expiresAt: date,
            redirectUri: item.redirect_uri,
            client: {
                id: item.client_id,
            },
            user: {
                id: item.user_id,
            },
            scope: item.scope,
        };

        expect(actual).toEqual(expected);
    });
});