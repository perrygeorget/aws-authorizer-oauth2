'use strict';

const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;

exports.transformCredential = (params) => ({
    index: 'IdUsernameGSI',
    where: 'id = :id',
    values: dynamodbAttrValue.wrap({
        ':id': params.id,
    }),
});

exports.transformCredentials = (params) => ({
    where: 'username = :username',
    values: dynamodbAttrValue.wrap({
        ':username': params.username,
    }),
});

exports.transformAccessToken = (params) => ({
    where: 'access_token = :access_token',
    values: dynamodbAttrValue.wrap({
        ':access_token': params.access_token,
    }),
});

exports.transformRefreshToken = (params) => ({
    where: 'refresh_token = :refresh_token',
    values: dynamodbAttrValue.wrap({
        ':refresh_token': params.refresh_token,
    }),
});

exports.transformClient = (params) => ({
    where: 'client_id = :client_id',
    values: dynamodbAttrValue.wrap({
        ':client_id': params.client_id,
    }),
});

exports.transformAuthorization = (params) => ({
    where: 'code = :code',
    values: dynamodbAttrValue.wrap({
        ':code': params.code,
    }),
});
