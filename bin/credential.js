'use strict';

const _ = require('lodash');
const passwordPrompt = require('password-prompt');
const program = require('commander');
const uuid = require('uuid').v4;
const Promise = require('bluebird');
const Table = require('cli-table');

const config = require('../src/lib/config');
const utils = require('../src/lib/utils');

const logger = require('../src/lib/logger').factory('credentials');

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
    process.env['SALT'] = 'add some salt';

    if (local) {
        process.env['ENV'] = 'local';
    }

    return {
        stage,
        debug,
        local,
    }
}


const create = async (username) => {
    init();
    logger.debug(`create ${username}`);

    const credentials = require('../src/lib/credentials/index');

    const item = await credentials.get(username);

    if (!_.isNil(item)) {
       console.error('ERROR: Credentials exists');
       return
    }

    console.log(`username: ${username}`);
    const password = await passwordPrompt('password: ');

    const hashedPassword = utils.hashPassword(password);

    credentials.put(uuid(), username, hashedPassword);
};

const update = async (username) => {
    init();
    logger.debug(`update ${username}`);

    const credentials = require('../src/lib/credentials/index');

    const item = await credentials.get(username);

    if (_.isNil(item)) {
        console.error('ERROR: Credentials not found');
        return
    }

    console.log(`username: ${username}`);
    const password = await passwordPrompt('password: ');

    logger.debug({ salt: config.salt() }, 'Salting password');

    const hashedPassword = utils.hashPassword(password);

    credentials.put(item.id, username, hashedPassword);
};

const destroy = async (username) => {
    init();
    logger.debug(`delete ${username}`);

    const credentials = require('../src/lib/credentials/index');
    const clients = require('../src/lib/clients/index');

    const user = await credentials.get(username);

    if (_.isNil(user)) {
        return
    }

    const existingClients = await clients.listForUser(user.id);

    await Promise.each(existingClients, (client) => {
        logger.debug({ client, username }, `delete clients for ${username}`);
        
        return clients.delete(client.client_id);
    });

    credentials.delete(username);
};

const list = () => {
    init();
    logger.debug('list');

    const credentials = require('../src/lib/credentials/index');

    const table = new Table({
        head: ['id', 'username', 'password'],
    });

    credentials.list()
        .then((items) => {
            logger.debug({ items }, 'Found credentials')

            _.each(items, (item) => {
                logger.debug({ item }, 'Credential');

                table.push([item.id, item.username, item.password]);
            });

            console.log(table.toString());
        });
};

const dumpEnv = () => {
    init();

    const table = new Table({
        head: ['Name', 'Value'],
        colWidths: [38, 38]
    });

    const keys = _.keys(process.env).sort();

    _.each(keys, (key) => {
        const value = process.env[key];

        table.push([key, value]);
    });

    console.log(table.toString());
};


program
    .version('0.1.0')
    .option('-s, --stage [value]', 'Stage of the service', 'dev')
    .option('-r, --region [value]', 'AWS regin', 'us-west-2')
    .option('-d, --debug', 'Show debug information')
    .option('-l, --local', 'Executes against local resources');

program
    .command('create <username>')
    .description('Add new credentials')
    .action(create);

program
    .command('update <username>')
    .description('Update existing credentials')
    .action(update);

program
    .command('delete <username>')
    .description('Remove existing credentials')
    .action(destroy);

program
    .command('list')
    .description('List all credentials')
    .action(list);

program
    .command('env')
    .description('Dump environment variables')
    .action(dumpEnv);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
