'use strict';

const querystring = require('querystring');

const _ = require('lodash');
const axios = require('axios');
const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;

const config = require('../lib/config');
const utils = require('../lib/utils');
const dynamodb = require('../lib/persistence/dynamodb');

const logger = require('../lib/logger').factory('resourceServer');

// GET /callback?code=SplxlOBeZQQYbYS6WxSbIA&state={client}:{secret} HTTP/1.1
exports.callbackHandler = (event, context, callback) => {
    logger.debug({ event }, 'got event');

    const code = _.get(event, 'queryStringParameters.code');
    const state = utils.decrypt(_.get(event, 'queryStringParameters.state'));
    const [username, password] = _.split(state, /:/);

    const local = process.env.LOCAL || false;

    // This is an assumption....
    const host = _.get(event, 'headers.Host');

    // This is an assumption....
    const protocol = local ? 'http' : 'https';

    const stagePathPart = `/${event.requestContext.stage}`;

    const options = {
        auth: {
            username,
            password,
        },
        baseURL: `${protocol}://${host}${stagePathPart}`,
    };

    const data = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${protocol}://${host}${event.requestContext.path}`,
    };

    const url = `${stagePathPart}/token`;

    logger.debug({ data, options, url }, 'requesting token');

    axios.create(options)
        .post('/token', querystring.stringify(data))
        .then(response => {
            const responseData = response.data;

            logger.info({ data: responseData }, 'success');

            const hasAccessToken = _.has(responseData, 'access_token');
            const statusCode = hasAccessToken ? 200 : 400;

            const body = JSON.stringify(responseData, null, 4);
            const length = body.length;

            callback(null, {
                isBase64Encoded: false,
                statusCode,
                headers: {
                    'content-type': 'application/json',
                    'content-length': length,
                },
                body,
            });
        })
        .catch(err => {
            logger.error({ err }, 'failure');
            const body = 'oops\n';
            const length = body.length;

            callback(null, {
                isBase64Encoded: false,
                statusCode: 500,
                headers: {
                    'content-type': 'text/plain; charset=utf-8',
                    'content-length': length,
                },
                body,
            });
        });
};

// GET /protected HTTP/1.1
// Authorization: Bearer 5d0d1092fb6d08945567ab241992efb20f202722
exports.protectedHandler = async (event, context, callback) => {
    logger.debug({ event }, 'got event');

    const authorized = _.get(event, 'requestContext.authorizer');

    const criteria = {
        index: 'IdUsernameGSI',
        where: 'id = :id',
        values: dynamodbAttrValue.wrap({
            ':id': authorized.user_id,
        }),
    };

    logger.debug({ table: config.credentialsTable(), criteria }, 'listCredentials');

    const user = await dynamodb.query(config.credentialsTable(), criteria)
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .then(_.first);

    const body = `Hello, ${user.username}. It is ${new Date()}.\n`;
    const length = body.length;

    callback(null, {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {
            'content-type': 'text/plain; charset=utf-8',
            'content-length': length,
        },
        body,
    });
};