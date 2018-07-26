'use strict';

const _ = require('lodash');
const dynamodbAttrValue = require('dynamodb-data-types').AttributeValue;

const config = require('../../config');
const utils = require('../../utils');
const dynamodb = require('../../persistence/dynamodb');
const criteriaFromParams = require('./criteriaFromParams');
const dataToDomain = require('./dataToDomain');
const dataGenerators = require('./dataGenerators');

const logger = require('../../logger').factory('lib.oauth2.model');

const getCredential = id => {
    const criteria = criteriaFromParams.transformCredential({ id });

    logger.debug({ table: config.credentialsTable(), criteria }, 'getCredential');

    return dynamodb.query(config.credentialsTable(), criteria)
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .then(_.first);
};

const listCredentials = (username, hashedPassword) => {
    const criteria = criteriaFromParams.transformCredentials({
        username,
    });

    logger.debug({ table: config.credentialsTable(), criteria }, 'listCredentials');

    return dynamodb.query(config.credentialsTable(), criteria)
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .filter(item => {
            logger.debug({ item, password: hashedPassword }, 'Filtering password');

            return item.password === hashedPassword;
        });
};

const listAccessTokens = (token) => {
    const criteria = criteriaFromParams.transformAccessToken({
        access_token: token,
    });

    logger.debug({ table: config.oauthAccessTokensTable(), criteria }, 'listAccessTokens');

    return dynamodb.query(config.oauthAccessTokensTable(), criteria)
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};

const listRefreshTokens = (token) => {
    const criteria = criteriaFromParams.transformRefreshToken({
        refresh_token: token,
    });

    logger.debug({ table: config.oauthRefreshTokensTable(), criteria }, 'listRefreshTokens');

    return dynamodb.query(config.oauthRefreshTokensTable(), criteria)
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};

const listClients = (clientId, clientSecret) => {
    const criteria = criteriaFromParams.transformClient({
        client_id: clientId,
    });

    logger.debug({ table: config.oauthClientsTable(), criteria }, 'listClients');

    return dynamodb.query(config.oauthClientsTable(), criteria)
        .tap((results) => {
            logger.debug({ results, criteria }, `clients found in ${config.oauthClientsTable()}`);
        })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap)
        .filter(item => {
            if (_.isNil(clientSecret)) {
                logger.debug({ item, client_secret: clientSecret }, 'Not filtering client_secret');
                return true;
            }

            logger.debug({ item, client_secret: clientSecret }, 'Filtering client_secret');

            return item.client_secret === clientSecret;
        });
};

const listAuthorizationCodes = (authorizationCode) => {
    const criteria = criteriaFromParams.transformAuthorization({
        code: authorizationCode,
    });

    logger.debug({ table: config.oauthAuthorizationsTable(), criteria }, 'listAuthorizationCodes');

    return dynamodb.query(config.oauthAuthorizationsTable(), criteria)
        .tap((results) => {
            logger.debug({ results, criteria }, `authorization codes found in ${config.oauthAuthorizationsTable()}`);
        })
        .then((response) => response.Items)
        .map(dynamodbAttrValue.unwrap);
};

/*
 * Get client.
 */

exports.getClient = async (clientId, clientSecret) => {
    logger.debug({
        clientId,
        clientSecret,
    }, 'getClient');

    const result = await listClients(clientId, clientSecret)
        .then(clients => {
            logger.debug({ clients }, 'getClient received clients');
            return clients;
        })
        .map(dataToDomain.transformClient)
        .then(_.first);

    logger.debug({ result }, 'received client');

    return result;
};

/*
 * Get user from client.
 */

exports.getUserFromClient = async function (client) {
    logger.debug({
        client,
    }, 'getUserFromClient');

    const result = await this.getClient(client.id);

    const userId = _.get(result, 'user.id');

    if (_.isNil(userId)) {
        logger.debug({ result, client }, 'user missing from client');
        return false;
    }

    const user = await getCredential(userId);

    if (_.isNil(user)) {
        logger.debug({ result, client }, 'user from client not found');
        return false;
    }

    logger.debug({ result, user, client }, 'user from client found');

    // All we need is the id
    return dataToDomain.transformCredentials(user);
};

/*
 * Get access token.
 */

exports.getAccessToken = async (accessToken) => {
    logger.debug({
        accessToken,
    }, 'getAccessToken');

    const result = await listAccessTokens(accessToken)
        .map(dataToDomain.transformAccessToken)
        .then(_.first);

    logger.debug({ result }, 'received access token');

    return result;
};

/**
 * Save token.
 */

exports.saveToken = async function (token, client, user) {
    logger.debug({
        token,
        client,
        user,
    }, 'saveAccessToken');

    const accessToken = dataGenerators.generateAccessToken(token, client, user);

    await dynamodb.put(config.oauthAccessTokensTable(), dynamodbAttrValue.wrap(accessToken));

    if (token.refreshToken) {
        const refreshToken = dataGenerators.generateRefreshToken(token, client, user);

        await dynamodb.put(config.oauthRefreshTokensTable(), dynamodbAttrValue.wrap(refreshToken));
    }

    return {
        ...token,
        client,
        user,
    };
};

/*
 * Get refresh token.
 */

exports.getRefreshToken = async (refreshToken) => {
    logger.debug({
        refreshToken,
    }, 'getRefreshToken');

    const result = await listRefreshTokens(refreshToken)
        .map(dataToDomain.transformRefreshToken)
        .then(_.first);

    logger.debug({ result }, 'received refresh token');

    return result;
};

exports.revokeToken = async function (token) {
    logger.debug({
        token,
    }, 'revokeToken');

    const refreshToken = await listRefreshTokens(token.refreshToken)
        .then(_.first);

    if (_.isNil(refreshToken)) {
        logger.debug('Cannot delete refresh token, because it is not found');
        return false;
    }

    const accessTokenKey = _.pick(refreshToken, ['access_token']);
    const refreshTokenKey = _.pick(refreshToken, ['refresh_token']);

    await dynamodb.delete(config.oauthAccessTokensTable(), dynamodbAttrValue.wrap(accessTokenKey));
    const result = await dynamodb.delete(config.oauthRefreshTokensTable(), dynamodbAttrValue.wrap(refreshTokenKey));

    logger.debug({ result }, 'deleted refresh token');

    return !_.isEmpty(result);
};

exports.getUser = async function (username, password) {
    if (logger.debug()) {
        const sanitizedPassword = _.isNil(password) ? null : password.replace(/\w/g, '*');
        logger.debug({ username, password: sanitizedPassword }, 'getUser');
    }

    const hashedPassword = utils.hashPassword(password);

    const user = await listCredentials(username, hashedPassword)
        .map(dataToDomain.transformCredentials)
        .then(_.first);


    if (_.isNil(user)) {
        logger.debug({ username, }, 'user not found');
        return false;
    }

    logger.debug({ username, user }, 'user found');

    return user;
};

exports.getAuthorizationCode = async function (authorizationCode) {
    logger.debug({ authorizationCode }, 'getAuthorizationCode');

    const result = await listAuthorizationCodes(authorizationCode)
        .map(dataToDomain.transformAuthorization)
        .then(_.first);

    logger.debug(result, 'received authorization');

    return result;
};

exports.saveAuthorizationCode = async function (code, client, user) {
    logger.debug({ code, client, user }, 'saveAuthorizationCode');

    const authorization = dataGenerators.generateAuthorization(code, client, user);

    const result = await dynamodb.put(config.oauthAuthorizationsTable(), dynamodbAttrValue.wrap(authorization));

    logger.debug({ result }, 'authorization code saved');

    return {
        ...code,
        client,
        user,
    };
};

exports.revokeAuthorizationCode = async function (code) {
    logger.debug({ code }, 'revokeAuthorizationCode');

    const key = await listAuthorizationCodes(code.code)
        .map((item) => _.pick(item, ['code']))
        .then(_.first);

    if (_.isNil(key)) {
        logger.debug('Cannot delete authorization, because it is not found');
        return false;
    }


    const result = await dynamodb.delete(config.oauthAuthorizationsTable(), dynamodbAttrValue.wrap(key));

    logger.debug({ result }, 'deleted authorization');

    return !_.isEmpty(result);
};

exports.verifyScope = function (token, scope) {
    logger.debug({ token, scope }, 'verifyScope');

    if (!token.scope) {
        return false;
    }

    const requestedScopes = scope.split(' ');
    const authorizedScopes = token.scope.split(' ');

    return requestedScopes.every(s => authorizedScopes.indexOf(s) >= 0);
};
