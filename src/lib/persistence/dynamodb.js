'use strict';

const AWS = require('aws-sdk');
const config = require('../config');

const logger = require('../logger').factory('lib.persistence.dynamodb');

AWS.config.setPromisesDependency(require('bluebird'));

// Consider switching to http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html
const dynamodb = new AWS.DynamoDB(config.dynamodb());

const scan = (params) => dynamodb.scan(params).promise();

const query = (params) => dynamodb.query(params).promise();

const putItem = (params) => dynamodb.putItem(params).promise();

const deleteItem = (params) => dynamodb.deleteItem(params).promise();

/**
 *
 * @param table {{string}}
 * @param item {*}
 */
exports.put = (table, item) => {
    const params = {
        TableName: table,
        Item: item,
        ReturnConsumedCapacity: 'TOTAL',
    };

    logger.debug({
        params,
        item,
    }, `putItem DynamoDB table ${table} with params`);

    return putItem(params);
};

/**
 *
 * @param table {{string}}
 * @param key {*}
 */
exports.delete = (table, key) => {
    const params = {
        TableName: table,
        Key: key,
        ReturnConsumedCapacity: 'TOTAL',
    };

    logger.debug({
        params,
        key,
    }, `deleteItem DynamoDB table ${table} with params`);

    return deleteItem(params);
};

exports.search = (table, criteria) => {
    const params = {
        TableName: table,
    };

    if (criteria.where) {
        params['FilterExpression'] = criteria.where;
        if (criteria.values) {
            params['ExpressionAttributeValues'] = criteria.values;
        }
    }

    return scan(params);
};

exports.query = (table, criteria) => {
    const params = {
        TableName: table,
        ScanIndexForward: true,
    };

    if (criteria.index) {
        params['IndexName'] = criteria.index;
        params['Select'] = 'ALL_PROJECTED_ATTRIBUTES';
    }

    if (criteria.where) {
        params['KeyConditionExpression'] = criteria.where;
        if (criteria.values) {
            params['ExpressionAttributeValues'] = criteria.values;
        }
    }

    logger.debug({ params }, 'Querying');

    return query(params);
};

exports.list = (table, criteria) => {
    const params = {
        TableName: table,
    };

    if (criteria && criteria.where) {
        params['KeyConditionExpression'] = criteria.where;
        params['ExpressionAttributeValues'] = criteria.values;
    }

    return scan(params);
};
