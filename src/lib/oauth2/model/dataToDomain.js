'use strict';

const _ = require('lodash');

function convertUnixTimeToDate(unixtime) {
    if (_.isNil(unixtime)) {
        return undefined;
    }
    return new Date(unixtime * 1000);
}

exports.transformClient = (item) => ({
    id: item.client_id,
    redirectUris: _.get(item, 'redirect_uris', null),
    grants: item.grants,
    user: {
        id: item.user_id,
    },
});

exports.transformRefreshToken = (item) => ({
    accessToken: item.access_token,
    refreshToken: item.refresh_token,
    refreshTokenExpiresAt: convertUnixTimeToDate(item.refresh_token_expires_on),
    scope: item.scope,
    client: {
        id: item.client_id,
    },
    user: {
        id: item.user_id,
    },
});

exports.transformAccessToken = (item) => ({
    accessToken: item.access_token,
    accessTokenExpiresAt: convertUnixTimeToDate(item.access_token_expires_on),
    scope: item.scope,
    client: {
        id: item.client_id,
    },
    user: {
        id: item.user_id,
    },
});

exports.transformCredentials = (item) => _.pick(item, ['id', 'username']);

exports.transformAuthorization = (item) => ({
    code: item.code,
    expiresAt: convertUnixTimeToDate(item.code_expires_on),
    scope: item.scope,
    redirectUri: item.redirect_uri,
    client: {
        id: item.client_id,
    },
    user: {
        id: item.user_id,
    },
});
