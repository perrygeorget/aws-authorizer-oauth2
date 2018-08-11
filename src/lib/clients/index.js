'use strict';

const _ = require('lodash');
const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;

const config = require('../../../src/lib/config');
const dynamodb = require('../../../src/lib/persistence/dynamodb');

const logger = require('../../../src/lib/logger').factory('clients');

exports.get = function (clientId) {
    logger.debug({ clientId }, 'Getting clients');

    return dynamodb.query(config.oauthClientsTable(), {
        where: 'client_id = :client_id',
        values: dynamodbAttrValue.wrap({
            ':client_id': clientId,
        }),
    })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .then(_.first);
};

exports.put = function (clientId, clientSecret, userId, description, grants, redirectUris) {
    logger.debug({ clientId, clientSecret, userId, description, grants }, 'Upserting clients');

    const item = {
        client_id: clientId,
        client_secret: clientSecret,
        user_id: userId,
        description,
        grants,
    };

    if (!_.isEmpty(redirectUris)) {
        item.redirect_uris = redirectUris;
    }

    return dynamodb.put(config.oauthClientsTable(), dynamodbAttrValue.wrap(item));
};

exports.delete = function (clientId) {
    logger.debug({ clientId }, 'Deleting clients');

    return dynamodb.delete(config.oauthClientsTable(), dynamodbAttrValue.wrap({
        client_id: clientId,
    }));
};

exports.list = function () {
    logger.debug('Listing clients');

    return dynamodb.list(config.oauthClientsTable())
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};

exports.listForUser = function (userId) {
    logger.debug({ userId }, 'Listing clients');

    return dynamodb.query(config.oauthClientsTable(), {
        index: 'UserIdClientIdGSI',
        where: 'user_id = :user_id',
        values: dynamodbAttrValue.wrap({
            ':user_id': userId,
        }),
    })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};
