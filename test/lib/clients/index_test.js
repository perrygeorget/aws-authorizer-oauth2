'use strict';

const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;
const Promise = require('bluebird');

const mockList = jest.fn();
const mockQuery = jest.fn();
const mockSearch = jest.fn();
const mockDelete = jest.fn();
const mockPut = jest.fn();

jest.mock('../../../src/lib/persistence/dynamodb', () => ({
    list: mockList,
    query: mockQuery,
    search: mockSearch,
    delete: mockDelete,
    put: mockPut,
}));

describe('clients.index', () => {
    const clientTable = 'DYNAMODB_OAUTH_CLIENTS_TABLE';
    const clients = require('../../../src/lib/clients');

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.DYNAMODB_OAUTH_CLIENTS_TABLE = clientTable;
    });

    afterEach(() => {
        delete process.env.DYNAMODB_OAUTH_CLIENTS_TABLE;
    });

    describe('get', () => {
        const client = {
            client_id: 'client-id',
            client_secret: 'client_secret',
        };

        test('found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [dynamodbAttrValue.wrap(client)],
            }));

            await expect(clients.get(client.client_id)).resolves.toEqual(client);

            await expect(mockQuery).toHaveBeenCalledWith(clientTable, {
                where: 'client_id = :client_id',
                values: dynamodbAttrValue.wrap({
                    ':client_id': client.client_id,
                }),
            });
        });

        test('not found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [],
            }));

            await expect(clients.get(client.client_id)).resolves.toBeUndefined();

            await expect(mockQuery).toHaveBeenCalledWith(clientTable, {
                where: 'client_id = :client_id',
                values: dynamodbAttrValue.wrap({
                    ':client_id': client.client_id,
                }),
            });
        });
    });

    describe('put', () => {
        const clientId = 'client-id';
        const clientSecret = 'client_secret';
        const userId = 'user-id';
        const description = 'lorem ipsum';
        const grants = ['password', 'client_credentials'];
        const client = {
            client_id: clientId,
            client_secret: clientSecret,
            user_id: userId,
            description,
            grants,
        };

        test('with redirect', async () => {
            const redirectUris = ['http://www.example.com'];
            const clientWithRedirects = {
                ...client,
                redirect_uris: redirectUris,
            };

            mockPut.mockImplementation(() => Promise.resolve());

            await clients.put(clientId, clientSecret, userId, description, grants, redirectUris);

            await expect(mockPut).toHaveBeenCalledWith(clientTable, dynamodbAttrValue.wrap(clientWithRedirects));
        });

        test('with redirects', async () => {
            const redirectUris = ['http://www.example.com', 'https://www.example.com'];
            const clientWithRedirects = {
                ...client,
                redirect_uris: redirectUris,
            };

            mockPut.mockImplementation(() => Promise.resolve());

            await clients.put(clientId, clientSecret, userId, description, grants, redirectUris);

            await expect(mockPut).toHaveBeenCalledWith(clientTable, dynamodbAttrValue.wrap(clientWithRedirects));
        });

        test('without redirects', async () => {
            mockPut.mockImplementation(() => Promise.resolve());

            await clients.put(clientId, clientSecret, userId, description, grants);

            await expect(mockPut).toHaveBeenCalledWith(clientTable, dynamodbAttrValue.wrap(client));
        });
    });

    describe('delete', () => {
        const client = {
            client_id: 'client-id',
        };

        test('found', async () => {
            mockDelete.mockImplementation(() => Promise.resolve());

            await clients.delete(client.client_id);

            await expect(mockDelete).toHaveBeenCalledWith(clientTable, dynamodbAttrValue.wrap(client));
        });

        test('not found', async () => {
            mockDelete.mockImplementation(() => Promise.resolve());

            await clients.delete(client.client_id);

            await expect(mockDelete).toHaveBeenCalledWith(clientTable, dynamodbAttrValue.wrap(client));
        });
    });

    describe('list', () => {
        const client = {
            client_id: 'client-id',
            client_secret: 'client_secret',
        };

        test('has some', async () => {
            mockList.mockImplementation(() => Promise.resolve({
                Items: [dynamodbAttrValue.wrap(client)],
            }));

            await expect(clients.list()).resolves.toEqual([client]);

            await expect(mockList).toHaveBeenCalledWith(clientTable);
        });
        test('has nothing', async () => {
            mockList.mockImplementation(() => Promise.resolve({
                Items: [],
            }));

            await expect(clients.list()).resolves.toEqual([]);

            await expect(mockList).toHaveBeenCalledWith(clientTable);
        });
    });

    describe('listForUser', () => {
        const userId = 'user-id';
        const client = {
            client_id: 'client-id',
            client_secret: 'client_secret',
        };

        test('found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [dynamodbAttrValue.wrap(client)],
            }));

            await expect(clients.listForUser(userId)).resolves.toEqual([client]);

            await expect(mockQuery).toHaveBeenCalledWith(clientTable, {
                index: 'UserIdClientIdGSI',
                where: 'user_id = :user_id',
                values: dynamodbAttrValue.wrap({
                    ':user_id': userId,
                }),
            });
        });

        test('not found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [],
            }));

            await expect(clients.listForUser(userId)).resolves.toEqual([]);

            await expect(mockQuery).toHaveBeenCalledWith(clientTable, {
                index: 'UserIdClientIdGSI',
                where: 'user_id = :user_id',
                values: dynamodbAttrValue.wrap({
                    ':user_id': userId,
                }),
            });
        });
    });
});