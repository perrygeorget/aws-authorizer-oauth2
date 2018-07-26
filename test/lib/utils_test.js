'use strict';

const utils = require('../../src/lib/utils');

const SALT = 'super salty';

describe('config', () => {
    afterEach(() => {
        delete process.env.SALT;
    });

    beforeEach(() => {
        process.env.SALT = SALT;
    });

    describe('hashPassword', () => {
        const password = 'super.duper.secret';

        test('hashing password returns something different than what was input', () => {
            const hashed = utils.hashPassword(password);

            expect(hashed).not.toEqual(password);
        });

        test('hashing password is repeatable', () => {
            const hashed = utils.hashPassword(password);
            const reHashed = utils.hashPassword(password);

            expect(reHashed).toEqual(hashed);
        });

        test('changing the salt changes the hash', () => {
            const hashed = utils.hashPassword(password);

            process.env.SALT = `extra ${SALT}`;

            const reHashed = utils.hashPassword(password);

            expect(reHashed).not.toEqual(hashed);
        });
    });

    describe('encrypt and decrypt', () => {
        const raw = 'string in the raw';

        test('encrypting returns something different than what was input', () => {
            const encrypted = utils.encrypt(raw);

            expect(encrypted).not.toEqual(raw)
        });

        test('decrypting restuns the original input', () => {
            const encrypted = utils.encrypt(raw);
            const decrypted = utils.decrypt(encrypted);

            expect(decrypted).toEqual(raw)

        })
    })
});
