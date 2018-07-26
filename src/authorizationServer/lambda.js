'use strict';

const querystring = require('querystring');

const _ = require('lodash');
const OAuth2Server = require('oauth2-server');

const logger = require('../lib/logger').factory('authorizationServer');
const model = require('../lib/oauth2/model');

const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;

const oauth = new OAuth2Server({
    model,
});


function addQueryString(event, options) {
    if (event.queryStringParameters) {
        options.query = event.queryStringParameters;
    } else {
        options.query = {};
    }
}

function addBody(event, options) {
    if (event.body) {
        options.body = extractBody(event);
    }
}

function extractBody(event) {
    if (event.body) {
        const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;

        const headers = _.mapKeys(event.headers, (value, key) => {
            return _.toLower(key);
        });

        logger.debug({ body, headers }, 'received a request');

        if (headers['content-type'] === 'application/x-www-form-urlencoded') {
            return querystring.parse(body);
        } else if (headers['content-type'] === 'application/json') {
            return JSON.parse(body);
        } else {
            return body;
        }
    }

    logger.warn('failed to extract body');

    return null;
}

function callbackWithResponse(response, callback) {
    const body = JSON.stringify(response.body);
    const length = body.length;

    callback(null, {
        isBase64Encoded: false,
        statusCode: response.status,
        headers: {
            'content-type': 'application/json; charset=utf-8',
            'content-length': length,
            ...response.headers,
        },
        body,
    });
}

function handleFulfill(response, callback) {
    return (res) => {
        // Success.
        logger.debug({ res, response }, 'The request was successfully');
        callbackWithResponse(response, callback);
    };
}

function handleReject(response, callback) {
    return (err) => {
        // Failure.
        logger.debug({ err, response }, 'The request failed');
        if (response.status === 200) {
            const body = {
                name: err.name,
                message: err.message,
            };

            if (err.hasOwnProperty('properties')) {
                body.properties = err.properties;
            }

            response.body = JSON.stringify(body);
            response.status = err.code;
        }
        callbackWithResponse(response, callback);
    };
}

function generateTokenOptions(event) {
    return {
        method: 'POST',
        headers: {
            'content-length': event.body.length.toString(),
            ...event.headers,
        },
    };
}

function generateAuthorizeOptions(event) {
    return {
        method: 'GET',
        headers: event.headers,
    };
}

// Help function to generate an IAM policy
function generatePolicy(principalId, effect, resource, token) {
    const authResponse = {};

    authResponse.principalId = principalId;
    if (effect && resource) {
        const policyDocument = {
            Version: '2012-10-17',
            Statement: [],
        };

        policyDocument.Statement.push({
            Action: 'execute-api:Invoke',
            Effect: effect,
            Resource: resource,
        });

        authResponse.policyDocument = policyDocument;
    }

    // Optional output with custom properties of the String, Number or Boolean type.
    authResponse.context = {
        user_id: _.get(token, 'user.id'),
        client_id: _.get(token, 'client.id'),
        scope: _.get(token, 'scope'),
        expires: _.get(token, 'accessTokenExpiresAt'),
    };
    return authResponse;
}

// TODO: Do this in a move API Gateway centric way. This should be via an authorizer which delegates to the resource server.
const authenticateHandler = {
    handle: (request, response) => {
        logger.debug({ request, response }, 'authenticateHandler got called');

        const authorization = request.get('authorization');

        if (_.isNil(authorization)) {
            return null;
        }

        const authParts = _.split(authorization, / /);

        if (authParts[0] !== 'Basic') {
            return null;
        }

        const decoded = Buffer.from(authParts[1], 'base64').toString();

        const [username, password] = _.split(decoded, /:/);

        logger.debug({
            username,
            password: password.replace(/\w/g, '*'),
        }, 'Decoded authorization header has');

        // TODO make this an API call to resourceServer's identity endpoint
        return model.getUser(username, password);
    },
};

exports.tokenHandler = (event, context, callback) => {
    logger.debug({ event }, 'got event');

    const options = generateTokenOptions(event);

    addQueryString(event, options);
    addBody(event, options);

    const request = new Request(options);

    const response = new Response({
        headers: {},
    });

    logger.debug({ request, response }, 'initial request and response');

    oauth.token(request, response)
        .then(handleFulfill(response, callback))
        .catch(handleReject(response, callback));
};

exports.authorizeHandler = (event, context, callback) => {
    logger.debug({ event }, 'got event');

    const options = generateAuthorizeOptions(event);

    addQueryString(event, options);

    const request = new Request(options);

    const response = new Response({
        headers: {},
    });

    logger.debug({ request, response }, 'initial request and response');

    const authOptions = {
        authenticateHandler,
    };

    oauth.authorize(request, response, authOptions)
        .then(handleFulfill(response, callback))
        .catch(handleReject(response, callback));
};

exports.bearerTokenAuthorizer = (event, context, callback) => {
    logger.debug({ event }, 'got event');

    const options = {
        method: 'GET',
        headers: {
            Authorization: event.authorizationToken,
        },
        query: {},
    };

    const request = new Request(options);

    const response = new Response({
        headers: {},
    });

    logger.debug({ request, response }, 'initial request and response');

    oauth.authenticate(request, response)
        .then(token => {
            logger.debug({ token }, 'got a token');
            callback(null, generatePolicy('user', 'Allow', event.methodArn, token));
        })
        .catch(err => {
            if (err.code === 401) {
                logger.info({ err }, 'unauthorized');
                callback('Unauthorized');   // Return a 401 Unauthorized response
            } else if (err.code === 403) {
                logger.info({ err }, 'forbidden');
                callback(null, generatePolicy('user', 'Deny', event.methodArn));
            } else {
                logger.error({ err }, 'failed to authenticate');
                callback(null, generatePolicy('user', 'Deny', event.methodArn));
            }
        });
};
