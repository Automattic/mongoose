'use strict';

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model: watch: ', function() {
  describe('with buffering', function() {
    let db;

    before(function() {
      if (!process.env.REPLICA_SET) {
        this.skip();
      }
    });

    beforeEach(function() {
      db = start();
    });

    afterEach(() => db.close());

    it('watch() before connecting (gh-5964)', async function() {
      const MyModel = db.model('Test5964', new Schema({ name: String }));

      // Synchronous, before connection happens
      const changeStream = MyModel.watch();
      const changed = new global.Promise(resolve => {
        changeStream.once('change', data => resolve(data));
      });

      await db.asPromise();
      await MyModel.create({ name: 'Ned Stark' });

      const changeData = await changed;
      assert.equal(changeData.operationType, 'insert');
      assert.equal(changeData.fullDocument.name, 'Ned Stark');
    });

    it('watch() close() prevents buffered watch op from running (gh-7022)', async function() {
      const MyModel = db.model('Test', new Schema({}));
      const changeStream = MyModel.watch();
      const ready = new global.Promise(resolve => {
        changeStream.once('data', () => {
          resolve(true);
        });
        setTimeout(resolve, 500, false);
      });

      const close = changeStream.close();
      await db.asPromise();
      const readyCalled = await ready;
      assert.strictEqual(readyCalled, false);

      await close;
    });

    it('watch() close() closes the stream (gh-7022)', async function() {
      const MyModel = db.model('Test', new Schema({ name: String }));

      await db.asPromise();
      await MyModel.init();

      const changeStream = MyModel.watch();
      const closed = new global.Promise(resolve => {
        changeStream.once('close', () => resolve(true));
      });

      await MyModel.create({ name: 'Hodor' });

      await changeStream.close();

      const closedData = await closed;
      assert.strictEqual(closedData, true);
    });
  });
});
