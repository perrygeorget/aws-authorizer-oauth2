'use strict';

const _ = require('lodash');

function convertDateToUnixTime(date) {
    if (_.isNil(date)) {
        return undefined;
    }
    return Math.floor(date.getTime() / 1000);
}

exports.generateAccessToken = (token, client, user) => {
    return {
        access_token: token.accessToken,
        access_token_expires_on: convertDateToUnixTime(token.accessTokenExpiresAt),
        scope: token.scope,
        client_id: client.id,
        user_id: user.id,
    };
};

exports.generateRefreshToken = (token, client, user) => {
    return {
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        refresh_token_expires_on: convertDateToUnixTime(token.refreshTokenExpiresAt),
        scope: token.scope,
        client_id: client.id,
        user_id: user.id,
    };
};

exports.generateAuthorization = (code, client, user) => {
    return {
        code: code.authorizationCode,
        code_expires_on: convertDateToUnixTime(code.expiresAt),
        scope: code.scope,
        redirect_uri: code.redirectUri,
        client_id: client.id,
        user_id: user.id,
    };
};

