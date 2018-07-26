'use strict';

const crypto = require('crypto');

const _ = require('lodash');
const program = require('commander');
const uuid = require('uuid').v4;
const Table = require('cli-table');

const logger = require('../src/lib/logger').factory('clients');

function generateSecret() {
    return crypto.createHash('sha256').update(uuid()).update('season salt').digest('hex');
}

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

function extractRedirectUris(options) {
    return options['authorizationCode'] === true ? null : options['authorizationCode'];
}

const generateGrants = (options) => {
    const grants = [];

    if (options['clientCredentials']) {
        grants.push('client_credentials');
    }
    if (options['refreshToken']) {
        grants.push('refresh_token');
    }
    if (options['authorizationCode']) {
        grants.push('authorization_code');
    }
    if (options['password']) {
        grants.push('password');
    }

    logger.debug({ grants }, 'generated grants');

    return grants;
};

const create = async (username, description, options) => {
    init();
    logger.debug(`create ${username} "${description}"`);

    const credentials = require('../src/lib/credentials/index');
    const clients = require('../src/lib/clients/index');

    const client = uuid();
    const secret = generateSecret();

    const user = await credentials.get(username);

    if (_.isNil(user)) {
        console.error('ERROR: Credentials not found');
        return;
    }

    const grants = generateGrants(options);

    const redirectUris = extractRedirectUris(options);

    if (_.isEmpty(grants)) {
        console.error('ERROR: No grants provided');
        return;
    }

    logger.debug({ user }, 'creating client for user');

    clients.put(client, secret, user.id, description, grants, redirectUris);
};

const update = async (client, username, description, options) => {
    init();
    logger.debug(`update ${client} ${username} "${description}"`);

    const credentials = require('../src/lib/credentials/index');
    const clients = require('../src/lib/clients/index');

    const user = await credentials.get(username);

    if (_.isNil(user)) {
        console.error('ERROR: Credentials not found');
        return;
    }

    const item = await clients.get(client);

    if (_.isNil(item)) {
        throw new Error('Client not found');
    }

    const secret = options.secret ? generateSecret() : item.secret;

    const grants = generateGrants(options);

    const redirectUris = extractRedirectUris(options);

    if (_.isEmpty(grants)) {
        console.error('ERROR: No grants provided');
        return;
    }

    clients.put(client, secret, user.id, description, grants, redirectUris);
};

const destroy = (username) => {
    init();
    logger.debug(`delete ${username}`);

    const clients = require('../src/lib/clients/index');

    clients.delete(username);
};

const list = () => {
    init();
    logger.debug('list');

    const clients = require('../src/lib/clients/index');

    const table = new Table({
        head: ['client', 'client_secret', 'user_id', 'grants', 'redirect_uris', 'description'],
    });

    clients.list()
        .then((items) => {
            logger.debug({ items }, 'Found clients');

            _.each(items, (item) => {
                logger.debug({ item }, 'Client');

                const description = item.description || '';

                const row = [
                    item.client_id,
                    item.client_secret,
                    item.user_id,
                    _.join(item.grants, ', '),
                    item.redirect_uris ? _.join(item.redirect_uris, ', ') : '',
                    description,
                ];
                table.push(row);
            });

            console.log(table.toString());
        });
};

const dumpEnv = () => {
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
};

const csv = (val) => {
    return _.split(val, /,/);
};


program
    .version('0.1.0')
    .option('-s, --stage [value]', 'Stage of the service', 'dev')
    .option('-r, --region [value]', 'AWS regin', 'us-west-2')
    .option('-d, --debug', 'Show debug information')
    .option('-l, --local', 'Executes against local resources');

program
    .command('create <username> [description]')
    .option('-C, --client-credentials', 'Allow grant by client credentials')
    .option('-R, --refresh-token', 'Allow grant by refresh token')
    .option('-A, --authorization-code <redirect uris>', 'Allow grant by authorization code', csv)
    .option('-P, --password', 'Allow grant by resource owner password credentials')
    .description('Add a new client')
    .action(create);

program
    .command('update <client> <username> [description]')
    .option('-C, --client-credentials', 'Allow grant by client credentials')
    .option('-R, --refresh-token', 'Allow grant by refresh token')
    .option('-A, --authorization-code [redirect uris]', 'Allow grant by authorization code', csv)
    .option('-P, --password', 'Allow grant by resource owner password credentials')
    .option('-S, --secret', 'Update secret')
    .description('Update an existing client')
    .action(update);

program
    .command('delete <client>')
    .description('Remove an existing client')
    .action(destroy);

program
    .command('list')
    .description('List all clients')
    .action(list);

program
    .command('env')
    .description('Dump environment variables')
    .action(dumpEnv);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
