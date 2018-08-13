'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('uuid').v4;

const clients = require('../lib/clients');
const utils = require('../lib/utils');

function doCall(operation, event) {
    if (operation === 'get') {
        const clientId = _.get(event, 'params.client_id');

        return clients.get(clientId);
    } else if (operation === 'put') {
        const clientId = _.get(event, 'params.client_id', uuid());
        const clientSecret = _.get(event, 'params.client_secret', utils.generateSecret());
        const userId = _.get(event, 'params.user_id');
        const description = _.get(event, 'params.description');
        const grants = _.get(event, 'params.grants', []);
        const redirectUris = _.get(event, 'params.redirect_uris', null);


        if(!_.isArray(grants)) {
            return Promise.reject(new Error('Invalid array param "grants"'));
        }
        if (_.isEmpty(grants)) {
            return Promise.reject(new Error('Required array param "grants"'));
        }

        if(!_.isNil(redirectUris) && !_.isArray(redirectUris)) {
            return Promise.reject(new Error('Invalid array param "redirect_uris"'));
        }

        if (_.isNil(clientId) || clientId.trim() === '') {
            return Promise.reject(new Error('Invalid param "client_id"'));
        }

        if (_.isNil(clientSecret) || clientSecret.trim() === '') {
            return Promise.reject(new Error('Invalid param "client_secret"'));
        }

        if (_.isNil(userId) || userId.trim() === '') {
            return Promise.reject(new Error('Required param "user_id"'));
        }

        return clients.put(clientId, clientSecret, userId, description, grants, redirectUris);
    } else if (operation === 'delete') {
        const clientId = _.get(event, 'params.client_id');

        if (_.isNil(clientId) || clientId.trim() === '') {
            return Promise.reject(new Error('Invalid param "client_id"'));
        }

        return clients.delete(clientId).then(() => null);
    } else if (operation === 'listForUser') {
        const userId = _.get(event, 'params.user_id');

        if (_.isNil(userId) || userId.trim() === '') {
            return Promise.reject(new Error('Required param "user_id"'));
        }

        return clients.listForUser(userId);
    } else if (operation === 'list') {
        return clients.list();
    }

    return Promise.reject(new Error(`Operation ${operation} not supported`));
}

exports.handler = (event, context, callback) => {
    const operation = _.get(event, 'action');

    doCall(operation, event)
        .then(response => {
            return {
                status: 'ok',
                response,
            };
        })
        .catch(err => {
            return {
                status: 'error',
                error: {
                    message: err.message
                },
            };
        })
        .then(payload => {
            callback(null, JSON.stringify(payload));
        });
};

