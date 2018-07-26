'use strict';

const Promise = require('bluebird');
const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;

const mockDynamoDBRunner = () => ({
    promise: () => Promise.resolve(),
});

const mockScan = jest.fn(mockDynamoDBRunner);
const mockQuery = jest.fn(mockDynamoDBRunner);
const mockPutItem = jest.fn(mockDynamoDBRunner);
const mockDeleteItem = jest.fn(mockDynamoDBRunner);

jest.mock('aws-sdk', () => ({
    config: {
        setPromisesDependency: jest.fn(),
    },
    DynamoDB: jest.fn().mockImplementation(() => ({
        scan: mockScan,
        query: mockQuery,
        putItem: mockPutItem,
        deleteItem: mockDeleteItem,
    })),
}));

describe('persistance.dynamodb', () => {
    const dynamodb = require('../../../src/lib/persistence/dynamodb');
    const table = 'table';

    beforeEach(() => {
        mockScan.mockClear();
        mockQuery.mockClear();
        mockPutItem.mockClear();
        mockDeleteItem.mockClear();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('put', () => {
        const item = dynamodbAttrValue.wrap({
            message: 'in a bottle',
        });

        test('passes params', async () => {
            await dynamodb.put(table, item);

            expect(mockPutItem).toHaveBeenCalledWith(expect.objectContaining({
                Item: item,
                TableName: table,
            }));
        });
    });

    describe('delete', () => {
        test('passes params', async () => {
            const key = dynamodbAttrValue.wrap({
                message: 'in a bottle',
            });

            await dynamodb.delete(table, key);

            expect(mockDeleteItem).toHaveBeenCalledWith(expect.objectContaining({
                Key: key,
                TableName: table,
            }));
        });
    });

    describe('search', () => {
        test('passes params for whole table', async () => {
            await dynamodb.search(table, {});

            expect(mockScan).toHaveBeenCalledWith({
                TableName: table,
            });
        });

        test('passes params for filtered values', async () => {
            const criteria = {
                where: 'attr = :attr',
                values: dynamodbAttrValue.wrap({ [':attr']: 'value' }),
            };

            await dynamodb.search(table, criteria);

            expect(mockScan).toHaveBeenCalledWith({
                TableName: table,
                FilterExpression: criteria.where,
                ExpressionAttributeValues: criteria.values,
            });
        });
    });

    describe('query', () => {
        test('passes params for whole table', async () => {
            await dynamodb.query(table, {});

            expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({
                TableName: table,
            }));
        });

        test('passes params for filtered values', async () => {
            const criteria = {
                index: 'IndexedAttrs',
                where: 'attr = :attr',
                values: dynamodbAttrValue.wrap({ [':attr']: 'value' }),
            };
            await dynamodb.query(table, criteria);

            expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({
                TableName: table,
                IndexName: criteria.index,
                KeyConditionExpression: criteria.where,
                ExpressionAttributeValues: criteria.values,
            }));
        });

    });

    describe('list', () => {
        test('passes params for whole table', async () => {
            await dynamodb.list(table, {});

            expect(mockScan).toHaveBeenCalledWith({
                TableName: table,
            });
        });

        test('passes params for filtered values', async () => {
            const criteria = {
                where: 'attr = :attr',
                values: dynamodbAttrValue.wrap({ [':attr']: 'value' }),
            };

            await dynamodb.list(table, criteria);

            expect(mockScan).toHaveBeenCalledWith({
                TableName: table,
                KeyConditionExpression: criteria.where,
                ExpressionAttributeValues: criteria.values,
            });
        });
    });
});
