'use strict';

const _ = require('lodash');
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

describe('credentials.index', () => {
    const credentialsTable = 'DYNAMODB_CREDENTIALS_TABLE';
    const credentials = require('../../../src/lib/credentials');

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.DYNAMODB_CREDENTIALS_TABLE = credentialsTable;
    });

    afterEach(() => {
        delete process.env.DYNAMODB_CREDENTIALS_TABLE;
    });

    describe('get', () => {
        const credential = {
            id: 'user-id',
            username: 'username',
            password: 'secret_password',
        };

        test('found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [dynamodbAttrValue.wrap(credential)],
            }));

            await expect(credentials.get(credential.username)).resolves.toEqual(credential);

            await expect(mockQuery).toHaveBeenCalledWith(credentialsTable, {
                where: 'username = :username',
                values: dynamodbAttrValue.wrap({
                    ':username': credential.username,
                }),
            });
        });

        test('not found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [],
            }));

            await expect(credentials.get(credential.username)).resolves.toBeUndefined();

            await expect(mockQuery).toHaveBeenCalledWith(credentialsTable, {
                where: 'username = :username',
                values: dynamodbAttrValue.wrap({
                    ':username': credential.username,
                }),
            });
        });
    });

    describe('getById', () => {
        const credential = {
            id: 'user-id',
            username: 'username',
            password: 'secret_password',
        };

        test('found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [dynamodbAttrValue.wrap(credential)],
            }));

            await expect(credentials.getById(credential.id)).resolves.toEqual(credential);

            await expect(mockQuery).toHaveBeenCalledWith(credentialsTable, {
                index: 'IdUsernameGSI',
                where: 'id = :id',
                values: dynamodbAttrValue.wrap({
                    ':id': credential.id,
                }),
            });
        });

        test('not found', async () => {
            mockQuery.mockImplementation(() => Promise.resolve({
                Items: [],
            }));

            await expect(credentials.getById(credential.id)).resolves.toBeUndefined();

            await expect(mockQuery).toHaveBeenCalledWith(credentialsTable, {
                index: 'IdUsernameGSI',
                where: 'id = :id',
                values: dynamodbAttrValue.wrap({
                    ':id': credential.id,
                }),
            });
        });
    });

    describe('put', () => {
        const credential = {
            id: 'user-id',
            username: 'username',
            password: 'secret_password',
        };

        test('with id, username, password', async () => {
            mockPut.mockImplementation(() => Promise.resolve());

            await credentials.put(credential.id, credential.username, credential.password);

            await expect(mockPut).toHaveBeenCalledWith(credentialsTable, dynamodbAttrValue.wrap(credential));
        });
    });

    describe('delete', () => {
        const credential = {
            username: 'username',
        };

        test('found', async () => {
            mockDelete.mockImplementation(() => Promise.resolve());

            await credentials.delete(credential.username);

            await expect(mockDelete).toHaveBeenCalledWith(credentialsTable, dynamodbAttrValue.wrap(credential));
        });

        test('not found', async () => {
            mockDelete.mockImplementation(() => Promise.resolve());

            await credentials.delete(credential.username);

            await expect(mockDelete).toHaveBeenCalledWith(credentialsTable, dynamodbAttrValue.wrap(credential));
        });
    });

    describe('list', () => {
        const credential = {
            id: 'user-id',
            username: 'username',
            password: 'secret_password',
        };

        test('has some', async () => {
            mockList.mockImplementation(() => Promise.resolve({
                Items: [dynamodbAttrValue.wrap(credential)],
            }));

            await expect(credentials.list()).resolves.toEqual([credential]);

            await expect(mockList).toHaveBeenCalledWith(credentialsTable);
        });
        test('has nothing', async () => {
            mockList.mockImplementation(() => Promise.resolve({
                Items: [],
            }));

            await expect(credentials.list()).resolves.toEqual([]);

            await expect(mockList).toHaveBeenCalledWith(credentialsTable);
        });
    });
});
