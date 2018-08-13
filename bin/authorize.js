'use strict';

const querystring = require('querystring');

const AWS = require('aws-sdk');

const _ = require('lodash');
const axios = require('axios');
const passwordPrompt = require('password-prompt');
const program = require('commander');
const Table = require('cli-table');

const logger = require('../src/lib/logger').factory('credentials');
const utils = require('../src/lib/utils');

AWS.config.setPromisesDependency(require('bluebird'));

function init() {
    logger.debug(`stage = ${program.stage}`);
    logger.debug(`debug = ${program.debug}`);

    const debug = _.get(program, 'debug', false);
    const local = _.get(program, 'local', false);
    const stage = program.stage === 'local' ? 'dev' : program.stage;

    if (debug) {
        console.log('debugging...');
        logger.level('debug');
    }

    process.env['DYNAMODB_CREDENTIALS_TABLE'] = `oauth2-${stage}-credentials`;
    process.env['DYNAMODB_OAUTH_AUTHORIZATIONS_TABLE'] = `oauth2-${stage}-oAuthorizations`;
    process.env['DYNAMODB_OAUTH_CLIENTS_TABLE'] = `oauth2-${stage}-oAuthClients`;
    process.env['DYNAMODB_OAUTH_ACCESS_TOKENS_TABLE'] = `oauth2-${stage}-oAuthAccessTokens`;
    process.env['DYNAMODB_OAUTH_REFRESH_TOKENS_TABLE'] = `oauth2-${stage}-oAuthRefreshTokens`;
    process.env['STAGE'] = stage;
    process.env['REGION'] = program.region;

    if (local) {
        process.env['ENV'] = 'local';
    }

    return {
        stage,
        debug,
        local,
    };
}

function printTokenResponse(tokenResponse) {
    console.log(`Token type: ${_.get(tokenResponse, 'data.token_type')}`);
    console.log(`Scope: ${_.get(tokenResponse, 'data.scope')}`);
    console.log(`Expires in seconds: ${_.get(tokenResponse, 'data.expires_in')}`);
    console.log(`Access token: ${_.get(tokenResponse, 'data.access_token')}`);
    console.log(`Refresh token: ${_.get(tokenResponse, 'data.refresh_token')}`);
}


program
    .version('0.1.0')
    .option('-s, --stage [value]', 'Stage of the service', 'dev')
    .option('-r, --region [value]', 'AWS region', 'us-west-2')
    .option('-d, --debug', 'Show debug information')
    .option('-l, --local', 'Executes against local resources');

// GET /authorize?response_type=code&client_id=s6BhdRkqt3&state=xyz
// &redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb HTTP/1.1
program
    .command('code <client_id>')
    .description('Generates and authorization code using client_id and state (recommended) with optional redirect URI and scope')
    .option('-R, --redirect-uri <value>', 'The redirection endpoint URI')
    .option('-S, --scope <scope>', 'The scope of the access request')
    .action(async (client_id, options) => {
        init();
        logger.debug(`code ${client_id} ${options['redirect-uri']} ${options.scope}`);

        const region = process.env['REGION'];
        const apiGateway = new AWS.APIGateway({
            region,
        });
        const clients = require('../src/lib/clients/index');
        const credentials = require('../src/lib/credentials/index');

        const restApi = await apiGateway.getRestApis().promise()
            .tap(x => logger.debug(x, 'promise api gateway get rest apis'))
            .then(response => response.items)
            .filter(item => {
                const expected = `${program.stage}-oauth2`;

                logger.debug({ item, expected }, 'filtering');

                return item.name === expected;
            })
            .then(_.first);

        const client = await clients.get(client_id);
        const user = await credentials.getById(client.user_id);

        logger.debug({ restApi, client, user }, 'got required data');

        const baseURL = program.local ? 'http://localhost:3000/' : `https://${restApi.id}.execute-api.${region}.amazonaws.com/${program.stage}/`;

        console.log(`username: ${user.username}`);
        const password = await passwordPrompt('password: ');

        console.log(`Using Basic Auth for "${user.username}"`);
        console.log('...');

        const codeOptions = {
            auth: {
                username: user.username,
                password: password,
            },
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 300 && status < 400; // default
            },
        };

        const data = {
            response_type: 'code',
            client_id,
            redirect_uri: options['redirect-uri'],
            state: utils.encrypt(`${client.client_id}:${client.client_secret}`),
        };

        if (options.scope) {
            data.scope = options.scope;
        }

        console.log(`Sending for username "${user.username}"`);
        console.log('...');

        logger.debug({ options: codeOptions, data });

        const codeResponse = await axios.create(codeOptions)
            .get(`${baseURL}/authorize?${querystring.stringify(data)}`);

        const location = codeResponse.headers.location;

        console.log(`Redirected (${codeResponse.status}): ${location}`);
        console.log('...');

        const tokenOptions = {
            auth: {
                username: user.username,
                password: password,
            },
        };

        const tokenResponse = await axios.create(tokenOptions)
            .get(location);

        printTokenResponse(tokenResponse);
    });

// POST /token HTTP/1.1
// Content-Type: application/x-www-form-urlencoded
//
// grant_type=password&username=johndoe&password=A3ddj3w
program
    .command('password <client_id>')
    .description('Authorize using username and password')
    .option('-S, --scope <scope>', 'The scope of the access request')
    .action(async (client_id, options) => {
        init();
        logger.debug(`password ${client_id} ${options.scope}`);

        const region = process.env['REGION'];
        const apiGateway = new AWS.APIGateway({
            region,
        });
        const clients = require('../src/lib/clients/index');
        const credentials = require('../src/lib/credentials/index');

        const restApi = await apiGateway.getRestApis().promise()
            .tap(x => logger.debug(x, 'promise api gateway get rest apis'))
            .then(response => response.items)
            .filter(item => {
                const expected = `${program.stage}-oauth2`;

                logger.debug({ item, expected }, 'filtering');

                return item.name === expected;
            })
            .then(_.first);

        const client = await clients.get(client_id);
        const user = await credentials.getById(client.user_id);

        logger.debug({ restApi, client, user }, 'got required data');

        const baseURL = program.local ? 'http://localhost:3000/' : `https://${restApi.id}.execute-api.${region}.amazonaws.com/${program.stage}/`;

        console.log(`username: ${user.username}`);
        const password = await passwordPrompt('password: ');

        console.log(`Using Basic Auth for client`);
        console.log('...');

        const tokenOptions = {
            auth: {
                username: client.client_id,
                password: client.client_secret,
            },
        };

        const data = {
            grant_type: 'password',
            username: user.username,
            password,
        };

        if (options.scope) {
            data.scope = options.scope;
        }

        console.log(`Sending ${data.grant_type} for client "${client.client_id}" on behalf of username "${user.username}"`);
        console.log('...');

        const response = await axios.create(tokenOptions)
            .post(`${baseURL}/token`, querystring.stringify(data));

        printTokenResponse(response);
    });

// POST /token HTTP/1.1
// Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
// Content-Type: application/x-www-form-urlencoded
//
// grant_type=client_credentials
program
    .command('client_credentials <client_id>')
    .description('Authorize using client credentials')
    .option('-S, --scope <scope>', 'The scope of the access request')
    .action(async (client_id, options) => {
        init();
        logger.debug(`client_credentials ${client_id} ${options.scope}`);

        const region = process.env['REGION'];
        const apiGateway = new AWS.APIGateway({
            region,
        });
        const clients = require('../src/lib/clients/index');

        const restApi = await apiGateway.getRestApis().promise()
            .tap(x => logger.debug(x, 'promise api gateway get rest apis'))
            .then(response => response.items)
            .filter(item => {
                const expected = `${program.stage}-oauth2`;

                logger.debug({ item, expected }, 'filtering');

                return item.name === expected;
            })
            .then(_.first);

        const client = await clients.get(client_id);

        logger.debug({ restApi, client }, 'got required data');

        const baseURL = program.local ? 'http://localhost:3000/' : `https://${restApi.id}.execute-api.${region}.amazonaws.com/${program.stage}/`;

        console.log(`Using Basic Auth for client`);
        console.log('...');

        const tokenOptions = {
            auth: {
                username: client.client_id,
                password: client.client_secret,
            },
        };

        const data = {
            grant_type: 'client_credentials',
        };

        if (options.scope) {
            data.scope = options.scope;
        }

        console.log(`Sending ${data.grant_type} for client "${client.client_id}"`);
        console.log('...');

        const response = await axios.create(tokenOptions)
            .post(`${baseURL}/token`, querystring.stringify(data));

        printTokenResponse(response);
    });

// POST /token HTTP/1.1
// Authorization: Basic czZCaGRSa3F0MzpnWDFmQmF0M2JW
// Content-Type: application/x-www-form-urlencoded
//
// grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
//
// ... or ...
//
// POST /token HTTP/1.1
// Host: server.example.com
// Content-Type: application/x-www-form-urlencoded
//
// grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
// &client_id=s6BhdRkqt3&client_secret=7Fjfp0ZBr1KtDRbnfVdmIw
program
    .command('refresh_token <client_id> <refresh_token>')
    .description('Authorize using a refresh token, client_id, and secret')
    .option('-C, --client-in-post', 'Using the client credentials in the request-body')
    .option('-S, --scope <scope>', 'The scope of the access request')
    .action(async (client_id, refresh_token, options) => {
        init();
        logger.debug(`refresh_token ${refresh_token} ${client_id} ${options.clientInPost} ${options.scope}`);

        const region = process.env['REGION'];
        const apiGateway = new AWS.APIGateway({
            region,
        });
        const clients = require('../src/lib/clients/index');

        const restApi = await apiGateway.getRestApis().promise()
            .tap(x => logger.debug(x, 'promise api gateway get rest apis'))
            .then(response => response.items)
            .filter(item => {
                const expected = `${program.stage}-oauth2`;

                logger.debug({ item, expected }, 'filtering');

                return item.name === expected;
            })
            .then(_.first);

        const client = await clients.get(client_id);

        logger.debug({ restApi, client }, 'got required data');

        const baseURL = program.local ? 'http://localhost:3000/' : `https://${restApi.id}.execute-api.${region}.amazonaws.com/${program.stage}/`;

        console.log(`Using Basic Auth for client`);
        console.log('...');

        const tokenOptions = {};

        const data = {
            grant_type: 'refresh_token',
            refresh_token,
        };

        if (options.clientInPost) {
            data.client_id = client_id;
            data.client_secret = client.client_secret;
        } else {
            tokenOptions.auth = {
                username: client_id,
                password: client.client_secret,
            };
        }

        if (options.scope) {
            data.scope = options.scope;
        }

        console.log(`Sending ${data.grant_type} for client "${client.client_id}"`);
        console.log('...');

        const response = await axios.create(tokenOptions)
            .post(`${baseURL}/token`, querystring.stringify(data));

        printTokenResponse(response);
    });

program
    .command('env')
    .description('Dump environment variables')
    .action(() => {
        init();

        const table = new Table({
            head: ['Name', 'Value'],
            colWidths: [38, 38],
        });

        const keys = _.keys(process.env).sort();

        _.each(keys, (key) => {
            const value = process.env[key];

            table.push([key, value]);
        });

        console.log(table.toString());
    });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
