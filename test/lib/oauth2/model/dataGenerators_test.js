'use strict';

const dataGenerators = require('../../../../src/lib/oauth2/model/dataGenerators.js');

describe('dataGenerators', () => {
    const date = new Date();
    const unixtime = Math.floor(date.getTime() / 1000);
        
    const client = {
        id: 'client-id',
        redirectUris: [
            'http://www.1.uri.com',
            'http://www.2.uri.com',
        ],
        grants: [
            'password',
            'client_credentials',
            
        ],
        accessTokenLifetime: 42,
        refreshTokenLifetime: 42,
    };
    const user = {
        id: 'user-id',
        username: 'username',
        password: 'password',
    };
    const token = {
        accessToken: 'access-token',
        accessTokenExpiresAt: date,
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: date,
        scope: 'SCOPE'
    };
    const infRefreshToken = {
        accessToken: 'access-token',
        accessTokenExpiresAt: date,
        refreshToken: 'refresh-token',
        scope: 'SCOPE'
    };
    const code = {
        authorizationCode: 'auth-code',
        expiresAt: date,
        redirectUri: 'http://www.1.uri.com',
        scope: 'SCOPE'
    };

    test('generateAccessToken', () => {
        const actual = dataGenerators.generateAccessToken(token, client, user);
        const expected = {
            access_token: token.accessToken,
            access_token_expires_on: unixtime,
            scope: token.scope,
            client_id: client.id,
            user_id: user.id,
        };

        expect(actual).toEqual(expected);
    });

    describe('generateRefreshToken', () => {
        test('with expires', () => {
            const actual = dataGenerators.generateRefreshToken(token, client, user);
            const expected = {
                access_token: token.accessToken,
                refresh_token: token.refreshToken,
                refresh_token_expires_on: unixtime,
                scope: token.scope,
                client_id: client.id,
                user_id: user.id,
            };

            expect(actual).toEqual(expected);
        });
        test('without expires', () => {
            const actual = dataGenerators.generateRefreshToken(infRefreshToken, client, user);
            const expected = {
                access_token: token.accessToken,
                refresh_token: token.refreshToken,
                scope: token.scope,
                client_id: client.id,
                user_id: user.id,
            };

            expect(actual).toEqual(expected);
        });
    });

    test('generateAuthorization', () => {
        const actual = dataGenerators.generateAuthorization(code, client, user);
        const expected = {
            code: code.authorizationCode,
            code_expires_on: unixtime,
            scope: code.scope,
            redirect_uri: code.redirectUri,
            client_id: client.id,
            user_id: user.id,
        };

        expect(actual).toEqual(expected);
    });
});