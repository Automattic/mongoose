'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('gh-16054', function () {
    let db;

    before(function () {
        db = start();
    });

    after(async function () {
        await db.close();
    });

    it('handles nested paths in optimisticConcurrency exclude (gh-16054)', async function () {
        const profileSchema = new Schema({ firstName: String, lastName: String }, { _id: false });
        const userSchema = new Schema({
            profile: profileSchema,
            balance: Number
        }, {
            optimisticConcurrency: { exclude: ['profile'] }
        });

        const User = db.model('User_gh16054_1', userSchema);

        const user = await User.create({
            profile: { firstName: 'Alice', lastName: 'Smith' },
            balance: 100
        });

        user.profile.firstName = 'Bob';
        user.$__delta();

        assert.strictEqual(user.$__.version, undefined, 'profile is excluded, so profile.firstName modification should not trigger versioning');
    });

    it('handles nested paths in optimisticConcurrency include array (gh-16054)', async function () {
        const profileSchema = new Schema({ firstName: String, lastName: String }, { _id: false });
        const userSchema = new Schema({
            profile: profileSchema,
            balance: Number
        }, {
            optimisticConcurrency: ['profile']
        });

        const User = db.model('User_gh16054_2', userSchema);

        const user = await User.create({
            profile: { firstName: 'Alice', lastName: 'Smith' },
            balance: 100
        });

        user.profile.firstName = 'Bob';
        user.$__delta();

        assert.ok(user.$__.version !== undefined, 'profile is included, so profile.firstName modification should trigger versioning');
    });

    it('triggers OCC when parent is modified if child is in include array (gh-16054)', async function () {
        const addressSchema = new Schema({ country: String, city: String }, { _id: false });
        const profileSchema = new Schema({ firstName: String, address: addressSchema }, { _id: false });
        const userSchema = new Schema({
            profile: profileSchema,
            balance: Number
        }, {
            optimisticConcurrency: ['profile.address.country']
        });

        const User = db.model('User_gh16054_3', userSchema);

        const user = await User.create({
            profile: { firstName: 'Alice', address: { country: 'USA', city: 'NY' } },
            balance: 100
        });

        user.profile.address = { country: 'Canada', city: 'Toronto' };
        user.$__delta();

        assert.ok(user.$__.version !== undefined, 'profile.address.country is included, so modifying profile.address should trigger OCC');
    });

    it('excludes nested paths if parent is in exclude list (gh-16054)', async function () {
        const addressSchema = new Schema({ country: String, city: String }, { _id: false });
        const profileSchema = new Schema({ firstName: String, address: addressSchema }, { _id: false });
        const userSchema = new Schema({
            profile: profileSchema,
            balance: Number
        }, {
            optimisticConcurrency: { exclude: ['profile.address'] }
        });

        const User = db.model('User_gh16054_4', userSchema);

        const user = await User.create({
            profile: { firstName: 'Alice', address: { country: 'USA', city: 'NY' } },
            balance: 100
        });

        user.profile.address.country = 'UK';
        user.$__delta();

        assert.strictEqual(user.$__.version, undefined, 'profile.address is excluded, so profile.address.country modification should not trigger versioning');
    });

    it('triggers OCC for parent modification even if subpath is excluded (gh-16054)', async function () {
        const addressSchema = new Schema({ country: String, city: String }, { _id: false });
        const profileSchema = new Schema({ firstName: String, address: addressSchema }, { _id: false });
        const userSchema = new Schema({
            profile: profileSchema,
            balance: Number
        }, {
            optimisticConcurrency: { exclude: ['profile.address'] }
        });

        const User = db.model('User_gh16054_5', userSchema);

        const user = await User.create({
            profile: { firstName: 'Alice', address: { country: 'USA', city: 'NY' } },
            balance: 100
        });

        user.profile = { firstName: 'Bob', address: { country: 'USA', city: 'NY' } };
        user.$__delta();

        assert.ok(user.$__.version !== undefined, 'profile is NOT excluded, only profile.address is. So modifying profile should trigger OCC.');
    });
});
