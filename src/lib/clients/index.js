'use strict';

const _ = require('lodash');
const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;

const config = require('../../../src/lib/config');
const dynamodb = require('../../../src/lib/persistence/dynamodb');

const logger = require('../../../src/lib/logger').factory('clients');

exports.get = function (client) {
    logger.debug({ client }, 'Getting clients');

    return dynamodb.query(config.oauthClientsTable(), {
        where: 'client_id = :client_id',
        values: dynamodbAttrValue.wrap({
            ':client_id': client,
        }),
    })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .then(_.first);
};

exports.put = function (client, secret, user_id, description, grants, redirectUris) {
    logger.debug({ client, secret, user_id, description, grants }, 'Upserting clients');

    const item = {
        client_id: client,
        client_secret: secret,
        user_id,
        description,
        grants,
    };

    if (!_.isEmpty(redirectUris)) {
        item.redirect_uris = redirectUris;
    }

    return dynamodb.put(config.oauthClientsTable(), dynamodbAttrValue.wrap(item));
};

exports.delete = function (client) {
    logger.debug({ client }, 'Deleting clients');

    return dynamodb.delete(config.oauthClientsTable(), dynamodbAttrValue.wrap({
        client_id: client,
    }));
};

exports.list = function () {
    logger.debug('Listing clients');

    return dynamodb.list(config.oauthClientsTable())
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};

exports.listForUser = function (user_id) {
    logger.debug({ user_id }, 'Listing clients');

    return dynamodb.query(config.oauthClientsTable(), {
        index: 'UserIdClientIdGSI',
        where: 'user_id = :user_id',
        values: dynamodbAttrValue.wrap({
            ':user_id': user_id,
        }),
    })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};
