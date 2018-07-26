'use strict';

const env = variable => process.env[variable];

exports.logLevel = () => env('LOG_LEVEL') || 'info';

exports.salt = () => env('SALT') || '';

exports.credentialsTable = () => env('DYNAMODB_CREDENTIALS_TABLE');

exports.oauthAuthorizationsTable = () => env('DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE');

exports.oauthClientsTable = () => env('DYNAMODB_OAUTH_CLIENTS_TABLE');

exports.oauthAccessTokensTable = () => env('DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE');

exports.oauthRefreshTokensTable = () => env('DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE');

exports.dynamodb = () => {
    if (env('ENV') === 'local') {
        return {
            endpoint: 'http://127.0.0.1:8000',
            region: env('REGION'),
        };
    }

    return {
        region: env('REGION'),
    };
};

exports._env = env;
