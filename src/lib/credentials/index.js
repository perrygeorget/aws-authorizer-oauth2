'use strict';

const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;
const _ = require('lodash');

const config = require('../../../src/lib/config');
const dynamodb = require('../../../src/lib/persistence/dynamodb');

const logger = require('../../../src/lib/logger').factory('credentials');

exports.get = function (username) {
    logger.debug({ username }, 'Getting credentials');

    return dynamodb.query(config.credentialsTable(), {
        where: 'username = :username',
        values: dynamodbAttrValue.wrap({
            ':username': username,
        }),
    })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .then(_.first);
};

exports.getById = function (id) {
    logger.debug({ id }, 'Getting credentials');

    return dynamodb.query(config.credentialsTable(), {
        index: 'IdUsernameGSI',
        where: 'id = :id',
        values: dynamodbAttrValue.wrap({
            ':id': id,
        }),
    })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .then(_.first);
};

exports.put = function (id, username, password) {
    logger.debug({ id, username, password }, 'Upserting credentials');

    return dynamodb.put(config.credentialsTable(), dynamodbAttrValue.wrap({
        id,
        username,
        password,
    }));
};

exports.delete = function (username) {
    logger.debug({ username }, 'Deleting credentials');

    return dynamodb.delete(config.credentialsTable(), dynamodbAttrValue.wrap({
        username,
    }));
};

exports.list = function () {
    logger.debug('Listing credentials');

    return dynamodb.list(config.credentialsTable())
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};
