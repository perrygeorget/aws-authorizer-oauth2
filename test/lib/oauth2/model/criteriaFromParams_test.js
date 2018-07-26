'use strict';

const mockWrap = jest.fn();

jest.mock('dynamodb-data-types', () => ({
    AttributeValue: {
        wrap: mockWrap,
    },
}));

describe('criteriaFromParams', () => {
    const criteriaFromParams = require('../../../../src/lib/oauth2/model/criteriaFromParams.js');

    const testFn = (fn, paramName) => () => {
        const params = {};
        const expected = {};
        const value = 'value';

        params[paramName] = value;
        expected[`:${paramName}`] = value;

        fn(params);

        return expect(mockWrap).toHaveBeenCalledWith(expected);
    };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('transformCredentials', () => {
        test('receives object for ":username" with value', testFn(criteriaFromParams.transformCredentials, 'username'));
    });

    describe('transformAccessToken', () => {
        test('receives object for ":access_token" with value', testFn(criteriaFromParams.transformAccessToken, 'access_token'));
    });

    describe('transformRefreshToken', () => {
        test('receives object for ":refresh_token" with value', testFn(criteriaFromParams.transformRefreshToken, 'refresh_token'));
    });

    describe('transformClient', () => {
        test('receives object for ":client_id" with value', testFn(criteriaFromParams.transformClient, 'client_id'));
    });

    describe('transformAuthorization', () => {
        test('receives object for ":code" with value', testFn(criteriaFromParams.transformAuthorization, 'code'));
    });
});
