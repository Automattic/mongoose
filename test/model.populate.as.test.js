
'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

describe('model: populate: as option', function () {
    let db;
    let User;
    let BlogPost;
    let user1;
    let post;

    before(function () {
        db = start();
    });

    after(async function () {
        await db.close();
    });

    beforeEach(async () => {
        await db.deleteModel(/.*/);

        const userSchema = new Schema({
            name: String
        });
        User = db.model('User', userSchema);

        const blogPostSchema = new Schema({
            title: String,
            authorId: { type: ObjectId, ref: 'User' },
            fans: [{ type: ObjectId, ref: 'User' }],
            comments: [{
                content: String,
                authorId: { type: ObjectId, ref: 'User' }
            }]
        });
        BlogPost = db.model('BlogPost', blogPostSchema);

        user1 = await User.create({ name: 'Val' });
        post = await BlogPost.create({
            title: 'Test',
            authorId: user1._id,
            fans: [user1._id],
            comments: [{ content: 'Nice', authorId: user1._id }]
        });
    });

    afterEach(async () => {
        await util.clearTestData(db);
    });

    it('should populate to a different path using "as"', async function () {
        const doc = await BlogPost.findById(post._id).populate({
            path: 'authorId',
            as: 'author'
        });

        assert.ok(doc.authorId instanceof mongoose.Types.ObjectId);
        assert.equal(doc.authorId.toString(), user1._id.toString());

        // Access via .get() or ._doc because 'author' is not in schema
        assert.ok(doc.get('author'));
        assert.equal(doc.get('author').name, 'Val');
    });

    it('should populate to a different path using "as" with lean', async function () {
        const doc = await BlogPost.findById(post._id).populate({
            path: 'authorId',
            as: 'author'
        }).lean();

        assert.ok(doc.authorId instanceof mongoose.Types.ObjectId);
        assert.equal(doc.authorId.toString(), user1._id.toString());

        assert.ok(doc.author);
        assert.equal(doc.author.name, 'Val');
    });

    it('should populate array to a different path using "as"', async function () {
        const doc = await BlogPost.findById(post._id).populate({
            path: 'fans',
            as: 'fansPopulated'
        });

        assert.equal(doc.fans.length, 1);
        assert.ok(doc.fans[0] instanceof mongoose.Types.ObjectId);

        const fansPopulated = doc.get('fansPopulated');
        assert.ok(Array.isArray(fansPopulated));
        assert.equal(fansPopulated.length, 1);
        assert.equal(fansPopulated[0].name, 'Val');
    });

    it('should populate nested path to a different nested path using "as"', async function () {
        const doc = await BlogPost.findById(post._id).populate({
            path: 'comments.authorId',
            as: 'comments.author'
        });

        assert.equal(doc.comments.length, 1);
        assert.ok(doc.comments[0].authorId instanceof mongoose.Types.ObjectId);

        // Accessing nested populated field might be tricky if not in schema
        // doc.comments[0] is a Subdocument.
        assert.ok(doc.comments[0].get('author'));
        assert.equal(doc.comments[0].get('author').name, 'Val');
    });

    it('should populate nested path to a different nested path using "as" with lean', async function () {
        const doc = await BlogPost.findById(post._id).populate({
            path: 'comments.authorId',
            as: 'comments.author'
        }).lean();

        assert.equal(doc.comments.length, 1);
        assert.ok(doc.comments[0].authorId instanceof mongoose.Types.ObjectId);

        assert.ok(doc.comments[0].author);
        assert.equal(doc.comments[0].author.name, 'Val');
    });
});

const util = require('./util');
