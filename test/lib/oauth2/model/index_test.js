'use strict';

const _ = require('lodash');
const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;
const Promise = require('bluebird');

const mockList = jest.fn();
const mockQuery = jest.fn();
const mockSearch = jest.fn();
const mockDelete = jest.fn();
const mockPut = jest.fn();

jest.mock('../../../../src/lib/persistence/dynamodb', () => ({
    list: mockList,
    query: mockQuery,
    search: mockSearch,
    delete: mockDelete,
    put: mockPut,
}));

jest.mock('../../../../src/lib/utils', () => ({
    hashPassword: password => `hashed-${password}`,
}));

describe('model.index', () => {
    const model = require('../../../../src/lib/oauth2/model/index.js');

    const unixtime = Math.floor(new Date().getTime() / 1000) + 60 * 60;
    const date = new Date(unixtime * 1000);

    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('getClient', () => {
        const clientDataObject = dynamodbAttrValue.wrap({
            redirect_uris: [
                'https://www.example.com/dev/callback',
            ],
            user_id: 'user-id',
            description: 'lorem ipsum',
            grants: [
                'authorization_code',
                'client_credentials',
                'password',
                'refresh_token',
            ],
            client_id: 'client-id',
            client_secret: 'client-secret',
        });
        const clientDomainObject = {
            grants: ['authorization_code', 'client_credentials', 'password', 'refresh_token'],
            id: 'client-id',
            redirectUris: ['https://www.example.com/dev/callback'],
            user: { id: 'user-id' },
        };

        test('client not found', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            return expect(model.getClient('client-id', 'client-secret')).resolves.toBeUndefined();
        });
        test('found by id, but with wrong secret', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [clientDataObject],
            }));

            return expect(model.getClient('client-id', 'wrong-client-secret')).resolves.toBeUndefined();
        });
        test('found by id and secret', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [clientDataObject],
            }));

            return expect(model.getClient('client-id', 'client-secret')).resolves.toEqual(clientDomainObject);
        });
        test('found by id, but with undefined secret', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [clientDataObject],
            }));

            return expect(model.getClient('client-id')).resolves.toEqual(clientDomainObject);
        });
    });

    describe('getUserFromClient', () => {
        const clientDataObject = dynamodbAttrValue.wrap({
            redirect_uris: [
                'https://www.example.com/dev/callback',
            ],
            user_id: 'user-id',
            description: 'lorem ipsum',
            grants: [
                'authorization_code',
                'client_credentials',
                'password',
                'refresh_token',
            ],
            client_id: 'client-id',
            client_secret: 'client-secret',
        });
        const clientDomainObject = {
            grants: ['authorization_code', 'client_credentials', 'password', 'refresh_token'],
            id: 'client-id',
            redirectUris: ['https://www.example.com/dev/callback'],
            user: { id: 'user-id' },
        };

        const userDataObject = dynamodbAttrValue.wrap({
            id: 'user-id',
            username: 'username',
            password: 'password',
        });

        const userDomainObject = {
            id: 'user-id',
            username: 'username',
        };

        test('client and user exists', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [clientDataObject],
            }));

            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [userDataObject],
            }));

            return expect(model.getUserFromClient(clientDomainObject)).resolves.toEqual(userDomainObject);
        });
        test('client does not exist', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            mockQuery.mockImplementationOnce(() => Promise.reject());

            return expect(model.getUserFromClient(clientDomainObject)).resolves.toBeFalsy();
        });
        test('user does not exist', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [clientDataObject],
            }));

            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            return expect(model.getUserFromClient(clientDomainObject)).resolves.toBeFalsy();
        });
    });

    describe('getAccessToken', () => {
        const accessToken = 'access-token';

        const accessTokenDataObject = dynamodbAttrValue.wrap({
            access_token: accessToken,
            user_id: 'user-id',
            access_token_expires_on: unixtime,
            client_id: 'client-id',
            scope: 'scope',
        });

        const accessTokenDomainObject = {
            accessToken,
            accessTokenExpiresAt: date,
            scope: 'scope',
            client: {
                id: 'client-id',
            },
            user: {
                id: 'user-id',
            },
        };

        test('exists', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [accessTokenDataObject],
            }));

            return expect(model.getAccessToken(accessToken)).resolves.toEqual(accessTokenDomainObject);
        });
        test('does not exists', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            return expect(model.getAccessToken(accessToken)).resolves.toBeUndefined();
        });
    });

    describe('saveToken', () => {
        const accessTokenTable = 'DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE';
        const refreshTokenTable = 'DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE';

        class TokenBuilder {
            constructor() {
                this.token = {
                    accessToken: 'access-token',
                    accessTokenExpiresAt: date,
                    client: {
                        id: 'client-id',
                    },
                    user: {
                        id: 'user-id',
                    },
                };
            }

            withInfiniteRefreshToken() {
                this.token.refreshToken = 'refresh-token';
                return this;
            }

            withExpiringRefreshToken() {
                this.withInfiniteRefreshToken();
                this.token.refreshTokenExpiresAt = date;
                return this;
            }

            withScope() {
                this.token.scope = 'scope';
                return this;
            }

            build() {
                return this.token;
            }

            buildAccessTokenDataObject() {
                const accessToken = {
                    access_token: this.token.accessToken,
                    access_token_expires_on: unixtime,
                    user_id: this.token.user.id,
                    client_id: this.token.client.id,
                };
                if (this.token.scope) {
                    accessToken.scope = this.token.scope;
                }

                return dynamodbAttrValue.wrap(accessToken);
            }

            buildRefreshTokenDataObject() {
                if (_.isNil(this.token.refreshToken)) {
                    return undefined;
                }

                const refreshToken = {
                    access_token: this.token.accessToken,
                    refresh_token: this.token.refreshToken,
                    user_id: this.token.user.id,
                    client_id: this.token.client.id,
                };
                if (this.token.refreshTokenExpiresAt) {
                    refreshToken.refresh_token_expires_on = unixtime;
                }
                if (this.token.scope) {
                    refreshToken.scope = this.token.scope;
                }

                return dynamodbAttrValue.wrap(refreshToken);
            }

            buildModels() {
                const tokenDomainObject = this.build();

                const token = _.omit(tokenDomainObject, ['client', 'user']);
                const client = tokenDomainObject.client;
                const user = tokenDomainObject.user;

                return { token, client, user };
            }
        }

        beforeEach(() => {
            process.env.DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE = accessTokenTable;
            process.env.DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE = refreshTokenTable;
        });

        afterEach(() => {
            delete process.env.DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE;
            delete process.env.DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE;
        });

        test('access token and refresh token with scope', async () => {
            const builder = new TokenBuilder().withExpiringRefreshToken().withScope();
            const tokenDomainObject = builder.build();
            const accessTokenDataObject = builder.buildAccessTokenDataObject();
            const refreshTokenDataObject = builder.buildRefreshTokenDataObject();

            const { token, client, user } = builder.buildModels();

            await expect(model.saveToken(token, client, user)).resolves.toEqual(tokenDomainObject);

            await expect(mockPut).toHaveBeenCalledTimes(2);
            await expect(mockPut).toHaveBeenNthCalledWith(1, accessTokenTable, accessTokenDataObject);
            await expect(mockPut).toHaveBeenNthCalledWith(2, refreshTokenTable, refreshTokenDataObject);
        });
        test('access token and non-expiring refresh token with scope', async () => {
            const builder = new TokenBuilder().withInfiniteRefreshToken().withScope();
            const tokenDomainObject = builder.build();
            const accessTokenDataObject = builder.buildAccessTokenDataObject();
            const refreshTokenDataObject = builder.buildRefreshTokenDataObject();

            const { token, client, user } = builder.buildModels();

            await expect(model.saveToken(token, client, user)).resolves.toEqual(tokenDomainObject);

            await expect(mockPut).toHaveBeenCalledTimes(2);
            await expect(mockPut).toHaveBeenNthCalledWith(1, accessTokenTable, accessTokenDataObject);
            await expect(mockPut).toHaveBeenNthCalledWith(2, refreshTokenTable, refreshTokenDataObject);
        });
        test('access token and refresh token without scope', async () => {
            const builder = new TokenBuilder().withExpiringRefreshToken();
            const tokenDomainObject = builder.build();
            const accessTokenDataObject = builder.buildAccessTokenDataObject();
            const refreshTokenDataObject = builder.buildRefreshTokenDataObject();

            const { token, client, user } = builder.buildModels();

            await expect(model.saveToken(token, client, user)).resolves.toEqual(tokenDomainObject);

            await expect(mockPut).toHaveBeenCalledTimes(2);
            await expect(mockPut).toHaveBeenNthCalledWith(1, accessTokenTable, accessTokenDataObject);
            await expect(mockPut).toHaveBeenNthCalledWith(2, refreshTokenTable, refreshTokenDataObject);
        });
        test('access token and non-expiring refresh token without scope', async () => {
            const builder = new TokenBuilder().withInfiniteRefreshToken();
            const tokenDomainObject = builder.build();
            const accessTokenDataObject = builder.buildAccessTokenDataObject();
            const refreshTokenDataObject = builder.buildRefreshTokenDataObject();

            const { token, client, user } = builder.buildModels();

            await expect(model.saveToken(token, client, user)).resolves.toEqual(tokenDomainObject);

            await expect(mockPut).toHaveBeenCalledTimes(2);
            await expect(mockPut).toHaveBeenNthCalledWith(1, accessTokenTable, accessTokenDataObject);
            await expect(mockPut).toHaveBeenNthCalledWith(2, refreshTokenTable, refreshTokenDataObject);
        });
        test('access token without refresh token with scope', async () => {
            const builder = new TokenBuilder().withScope();
            const tokenDomainObject = builder.build();
            const accessTokenDataObject = builder.buildAccessTokenDataObject();

            const { token, client, user } = builder.buildModels();

            await expect(model.saveToken(token, client, user)).resolves.toEqual(tokenDomainObject);

            await expect(mockPut).toHaveBeenCalledTimes(1);
            await expect(mockPut).toHaveBeenNthCalledWith(1, accessTokenTable, accessTokenDataObject);
        });
        test('access token without refresh token without scope', async () => {
            const builder = new TokenBuilder();
            const tokenDomainObject = builder.build();
            const accessTokenDataObject = builder.buildAccessTokenDataObject();

            const { token, client, user } = builder.buildModels();

            await expect(model.saveToken(token, client, user)).resolves.toEqual(tokenDomainObject);

            await expect(mockPut).toHaveBeenCalledTimes(1);
            await expect(mockPut).toHaveBeenNthCalledWith(1, accessTokenTable, accessTokenDataObject);
        });
    });

    describe('getRefreshToken', () => {
        const refreshToken = 'refresh-token';
        const unixtime = Math.floor(new Date().getTime() / 1000) + 60 * 60;
        const date = new Date(unixtime * 1000);

        const refreshTokenDataObject = dynamodbAttrValue.wrap({
            refresh_token: refreshToken,
            user_id: 'user-id',
            refresh_token_expires_on: unixtime,
            client_id: 'client-id',
            scope: 'scope',
        });

        const refreshTokenDomainObject = {
            refreshToken,
            refreshTokenExpiresAt: date,
            scope: 'scope',
            client: {
                id: 'client-id',
            },
            user: {
                id: 'user-id',
            },
        };

        test('exists', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [refreshTokenDataObject],
            }));

            return expect(model.getRefreshToken(refreshToken)).resolves.toEqual(refreshTokenDomainObject);
        });
        test('does not exists', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            return expect(model.getRefreshToken(refreshToken)).resolves.toBeUndefined();
        });
    });

    describe('revokeToken', () => {
        const token = {
            refreshToken: 'refresh-token',
            refreshTokenExpiresAt: date,
            client: {
                id: 'client-id',
            },
            user: {
                id: 'user-id',
            },
        };

        const refreshTokenDataObject = dynamodbAttrValue.wrap({
            refresh_token: token.refreshToken,
            user_id: 'user-id',
            refresh_token_expires_on: unixtime,
            client_id: 'client-id',
        });

        test('existing', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [refreshTokenDataObject],
            }));
            _.times(2, () => {
                mockDelete.mockImplementationOnce(() => Promise.resolve({
                    ConsumedCapacity: {
                        TableName: 'foo',
                        CapacityUnits: 1,
                    },
                }));
            });

            return expect(model.revokeToken(token)).resolves.toBeTruthy();
        });
        test('does not exist', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            return expect(model.revokeToken(token)).resolves.toBeFalsy();
        });
    });

    describe('getUser', () => {
        const userDataObject = dynamodbAttrValue.wrap({
            id: 'user-id',
            username: 'username',
            password: 'hashed-password',
        });

        const userDomainObject = {
            id: 'user-id',
            username: 'username',
        };

        test('found by username and password', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [userDataObject],
            }));

            return expect(model.getUser('username', 'password')).resolves.toEqual(userDomainObject);
        });
        test('found by username, but with wrong password', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [userDataObject],
            }));

            return expect(model.getUser('username', 'wrong-password')).resolves.toBeFalsy();
        });
        test('found by username, but with missing password', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [userDataObject],
            }));

            return expect(model.getUser('username')).resolves.toBeFalsy();
        });
        test('user not found', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            return expect(model.getUser('username', 'password')).resolves.toBeFalsy();
        });
    });

    describe('getAuthorizationCode', () => {
        const codeDomainObject = {
            code: 'code',
            expiresAt: date,
            redirectUri: 'http://www.example.com',
            scope: 'scope',
            client: {
                id: 'client-id',
            },
            user: {
                id: 'user-id',
            },
        };
        const codeDataObject = dynamodbAttrValue.wrap({
            code: 'code',
            code_expires_on: unixtime,
            redirect_uri: 'http://www.example.com',
            scope: 'scope',
            client_id: 'client-id',
            user_id: 'user-id',
        });

        test('found', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [codeDataObject],
            }));

            return expect(model.getAuthorizationCode('code')).resolves.toEqual(codeDomainObject);
        });
        test('not found', () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            return expect(model.getAuthorizationCode('code')).resolves.toBeUndefined();
        });
    });

    describe('saveAuthorizationCode', () => {
        const authorizationCodeTable = 'DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE';

        beforeEach(() => {
            process.env.DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE = authorizationCodeTable;
        });

        afterEach(() => {
            delete process.env.DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE;
        });

        const client = {
            id: 'client-id',
        };
        const user = {
            id: 'user-id',
        };
        const codeDomainObject = {
            authorizationCode: 'authorizationCode',
            expiresAt: date,
            redirectUri: 'http://www.example.com',
            scope: 'scope',
            client,
            user,
        };
        const codeDataObject = dynamodbAttrValue.wrap({
            code: 'authorizationCode',
            code_expires_on: unixtime,
            redirect_uri: 'http://www.example.com',
            scope: 'scope',
            client_id: 'client-id',
            user_id: 'user-id',
        });

        test('with scope', async () => {
            const code = _.omit(codeDomainObject, ['client', 'user']);

            await expect(model.saveAuthorizationCode(code, client, user)).resolves.toEqual(codeDomainObject);

            await expect(mockPut).toHaveBeenCalledTimes(1);
            await expect(mockPut).toHaveBeenCalledWith(authorizationCodeTable, codeDataObject);
        });
        test('without scope', async () => {
            const code = _.omit(codeDomainObject, ['client', 'user', 'scope']);
            const expected = _.omit(codeDomainObject, ['scope']);

            await expect(model.saveAuthorizationCode(code, client, user)).resolves.toEqual(expected);

            await expect(mockPut).toHaveBeenCalledTimes(1);
            await expect(mockPut).toHaveBeenCalledWith(authorizationCodeTable, _.omit(codeDataObject, ['scope']));
        });
        test('without redirect', async () => {
            const code = _.omit(codeDomainObject, ['client', 'user', 'redirectUri']);
            const expected = _.omit(codeDomainObject, ['redirectUri']);

            await expect(model.saveAuthorizationCode(code, client, user)).resolves.toEqual(expected);

            await expect(mockPut).toHaveBeenCalledTimes(1);
            await expect(mockPut).toHaveBeenCalledWith(authorizationCodeTable, _.omit(codeDataObject, ['redirect_uri']));
        });
    });

    describe('revokeAuthorizationCode', () => {
        const authorizationCodeTable = 'DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE';

        beforeEach(() => {
            process.env.DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE = authorizationCodeTable;
        });

        afterEach(() => {
            delete process.env.DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE;
        });

        const client = {
            id: 'client-id',
        };
        const user = {
            id: 'user-id',
        };
        const codeDomainObject = {
            code: 'authorizationCode',
            expiresAt: date,
            redirectUri: 'http://www.example.com',
            scope: 'scope',
            client,
            user,
        };
        const codeDataObject = dynamodbAttrValue.wrap({
            code: 'authorizationCode',
            code_expires_on: unixtime,
            redirect_uri: 'http://www.example.com',
            scope: 'scope',
            client_id: 'client-id',
            user_id: 'user-id',
        });

        test('found', async () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [codeDataObject],
            }));
            mockDelete.mockImplementationOnce(() => Promise.resolve({
                ConsumedCapacity: {
                    TableName: 'foo',
                    CapacityUnits: 1,
                },
            }));

            await expect(model.revokeAuthorizationCode(codeDomainObject)).resolves.toBeTruthy();

            await expect(mockDelete).toHaveBeenCalledTimes(1);
            await expect(mockDelete).toHaveBeenCalledWith(authorizationCodeTable, dynamodbAttrValue.wrap({ code: 'authorizationCode' }));
        });
        test('not found', async () => {
            mockQuery.mockImplementationOnce(() => Promise.resolve({
                Items: [],
            }));

            await expect(model.revokeAuthorizationCode(codeDomainObject)).resolves.toBeFalsy();

            await expect(mockDelete).toHaveBeenCalledTimes(0);
        });
    });

    describe('verifyScope', () => {
        class TokenBuilder {
            constructor() {
                this.token = {
                    accessToken: 'access-token',
                    client: {
                        id: 'client-id',
                    },
                    user: {
                        id: 'user-id',
                    },
                };
            }

            withScope(scope) {
                this.token.scope = scope;
                return this;
            }

            build() {
                return this.token;
            }
        }

        test('token has all scopes', () => {
            const token = new TokenBuilder().withScope('scope soap').build();
            const scope = 'scope soap';

            expect(model.verifyScope(token, scope)).toBeTruthy();
        });
        test('token missing a scope', () => {
            const token = new TokenBuilder().withScope('scope').build();
            const scope = 'scope soap';

            expect(model.verifyScope(token, scope)).toBeFalsy();
        });
        test('token an extra scope', () => {
            const token = new TokenBuilder().withScope('scope soap').build();
            const scope = 'scope';

            expect(model.verifyScope(token, scope)).toBeTruthy();
        });
        test('token has no scopes', () => {
            const token = new TokenBuilder().build();
            const scope = 'scope soap';

            expect(model.verifyScope(token, scope)).toBeFalsy();
        });
    });
});
