const crypto = require('crypto');

const sha1 = require('sha1');

const config = require('./config');

const algorithm = 'aes256';
const cryptoPassword = config.salt();

exports.hashPassword = password => sha1(config.salt() + password);

exports.encrypt = text => {
    const cipher = crypto.createCipher(algorithm, cryptoPassword);
    let crypted = cipher.update(text, 'utf8', 'hex');

    crypted += cipher.final('hex');

    return crypted;
};

exports.decrypt = text => {
    const decipher = crypto.createDecipher(algorithm, cryptoPassword);
    let dec = decipher.update(text, 'hex', 'utf8');

    dec += decipher.final('utf8');

    return dec;
}
