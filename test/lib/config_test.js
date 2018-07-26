'use strict';

const config = require('../../src/lib/config');

describe('config', () => {
    afterEach(() => {
        delete process.env.LOG_LEVEL;
        delete process.env.SALT;
        delete process.env.DYNAMODB_CREDENTIALS_TABLE;
        delete process.env.DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE;
        delete process.env.DYNAMODB_OAUTH_CLIENTS_TABLE;
        delete process.env.DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE;
        delete process.env.DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE;
        delete process.env.REGION;
        delete process.env.ENV;
    });

    describe('logLevel', () => {
        test('has default of "info"', () => {
            const actual = config.logLevel();

            expect(actual).toEqual('info');
        });

        test('returns expected value', () => {
            process.env.LOG_LEVEL = 'LOG_LEVEL';

            const actual = config.logLevel();

            expect(actual).toEqual('LOG_LEVEL');
        });
    });

    describe('salt', () => {
        test('has default of ""', () => {
            const actual = config.salt();

            expect(actual).toEqual('');
        });

        test('returns expected value', () => {
            process.env.SALT = 'SALT';

            const actual = config.salt();

            expect(actual).toEqual('SALT');
        });
    });

    describe('credentialsTable', () => {
        test('has default of `undefined`', () => {
            const actual = config.credentialsTable();

            expect(actual).toBeUndefined();
        });

        test('returns expected value', () => {
            process.env.DYNAMODB_CREDENTIALS_TABLE = 'DYNAMODB_CREDENTIALS_TABLE';

            const actual = config.credentialsTable();

            expect(actual).toEqual('DYNAMODB_CREDENTIALS_TABLE');
        });
    });

    describe('oauthAuthorizationsTable', () => {
        const actual = config.oauthAuthorizationsTable();

        test('has default of `undefined`', () => {
            expect(actual).toBeUndefined();
        });

        test('returns expected value', () => {
            process.env.DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE = 'DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE';

            const actual = config.oauthAuthorizationsTable();

            expect(actual).toEqual('DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE');
        });
    });

    describe('oauthClientsTable', () => {
        test('has default of `undefined`', () => {
            const actual = config.oauthClientsTable();

            expect(actual).toBeUndefined();
        });

        test('returns expected value', () => {
            process.env.DYNAMODB_OAUTH_CLIENTS_TABLE = 'DYNAMODB_OAUTH_CLIENTS_TABLE';

            const actual = config.oauthClientsTable();

            expect(actual).toEqual('DYNAMODB_OAUTH_CLIENTS_TABLE');
        });
    });

    describe('oauthAccessTokensTable', () => {
        test('has default of `undefined`', () => {
            const actual = config.oauthAccessTokensTable();

            expect(actual).toBeUndefined();
        });

        test('returns expected value', () => {
            process.env.DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE = 'DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE';

            const actual = config.oauthAccessTokensTable();

            expect(actual).toEqual('DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE');
        });
    });

    describe('oauthRefreshTokensTable', () => {
        test('has default of `undefined`', () => {
            const actual = config.oauthRefreshTokensTable();

            expect(actual).toBeUndefined();
        });

        test('returns expected value', () => {
            process.env.DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE = 'DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE';

            const actual = config.oauthRefreshTokensTable();

            expect(actual).toEqual('DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE');
        });
    });

    describe('dynamodb', () => {
        const region = 'us-west-88';
        
        beforeEach(() => {
            process.env.REGION = region;
        });
        
        test('when environment varialbe ENV is not set', () => {
            const expected = {
                region,
            };

            const actual = config.dynamodb();

            expect(actual).toMatchObject(expected);
        });

        test('when environment varialbe ENV is set to "local"', () => {
            process.env.ENV = 'local';

            const expected = {
                endpoint: 'http://127.0.0.1:8000',
                region,
            };

            const actual = config.dynamodb();

            expect(actual).toMatchObject(expected);
        });

        test('when environment varialbe ENV is set to something other than "local"', () => {
            process.env.ENV = 'cloud';

            const expected = {
                region,
            };

            const actual = config.dynamodb();

            expect(actual).toMatchObject(expected);
        });
    });
});
