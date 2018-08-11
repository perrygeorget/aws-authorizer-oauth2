'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('uuid').v4;

const credentials = require('../lib/credentials');

function doCall(operation, event) {
    if (operation === 'get') {
        const username = _.get(event, 'params.username');

        return credentials.get(username)
            .then(response => _.omit(response, ['password']));
    } else if (operation === 'getById') {
        const id = _.get(event, 'params.id');

        return credentials.getById(id)
            .then(response => _.omit(response, ['password']));
    } else if (operation === 'put') {
        const id = _.get(event, 'params.id', uuid());
        const username = _.get(event, 'params.username');
        const password = _.get(event, 'params.password');

        if (_.isNil(username) || username.trim() === '') {
            return Promise.reject(new Error('Required param "username"'));
        }

        if (_.isNil(password) || password.trim() === '') {
            return Promise.reject(new Error('Required param "password"'));
        }

        return credentials.put(id, username, password);
    } else if (operation === 'delete') {
        const username = _.get(event, 'params.username');

        if (_.isNil(username) || username.trim() === '') {
            return Promise.reject(new Error('Invalid param "username"'));
        }

        return credentials.delete(username);
    } else if (operation === 'list') {
        return credentials.list()
            .map(response => _.omit(response, ['password']));
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
                    message: err.message,
                },
            };
        })
        .then(payload => {
            callback(null, JSON.stringify(payload));
        });
};
