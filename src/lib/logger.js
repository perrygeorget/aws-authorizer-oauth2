'use strict';

const bunyan = require('bunyan');

const config = require('./config');

exports.factory = (name) => bunyan.createLogger({
    name,
    serializers: {
        err: bunyan.stdSerializers.err,
        error: bunyan.stdSerializers.err,
    },
    streams: [
        {
            level: config.logLevel(),
            stream: process.stdout,
        },
    ],
});