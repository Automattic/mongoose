'use strict';

const mongoose = require('../..');
const { MongoMemoryServer } = require('mongodb-memory-server');
const uuid = require('uuid').v4;
const _ = require('lodash');
const callContext = require('./callContext');

const pluginSave = (schema) => {
  schema.pre(['save'], function() {
    const store = callContext.get();

    if (this.name !== store.name) {
      console.error('[static-hooks] [pre] [save]', this.name, store.name);
    } else {
      console.log('[OK] [static-hooks] [pre] [save]');
    }
  });

  schema.post(['save'], function() {
    const store = callContext.get();

    if (this.name !== store.name) {
      console.error('[ERROR] [static-hooks] [post] [save]', this.name, store.name);
    } else {
      console.log('[OK] [static-hooks] [post] [save]');
    }
  });
};

const pluginOther = (schema) => {
  schema.pre(['find', 'findOne', 'count', 'aggregate'], function() {
    const store = callContext.get();

    if (this._conditions.name !== store.name) {
      console.error(`[ERROR] [static-hooks] [pre] [${this.op}]`, this._conditions.name, store.name);
    } else {
      console.log(`[OK] [static-hooks] [pre] [${this.op}]`);
    }
  });

  schema.post(['find', 'findOne', 'count', 'aggregate'], function() {
    const store = callContext.get();
    if (this._conditions.name !== store.name) {
      console.error(`[ERROR] [static-hooks] [post] [${this.op}]`, this._conditions.name, store.name);
    } else {
      console.log(`[OK] [static-hooks] [post] [${this.op}]`);
    }
  });
};

mongoose.plugin(pluginSave);
mongoose.plugin(pluginOther);

let createCounter = 0;
let findCallbackCounter = 0;
let findPromiseCounter = 0;

(async() => {
  const mongod = new MongoMemoryServer();
  const uri = await mongod.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const userSchema = new mongoose.Schema({ name: String });
  const UserModel = mongoose.model('UserModel', userSchema);

  const names = [];

  // prepare data
  await new Promise((resolve, reject) => {
    for (let i = 0; i < 50; ++i) {
      setTimeout(async() => {
        const name = uuid();
        names.push(name);
        callContext.enter({ name });

        const user = new UserModel({ name });
        try {
          await user.save();
        } catch (err) {
          reject(err);
        }

        createCounter++;

        if (createCounter === 50) {
          resolve();
        }
      }, _.random(10, 50));
    }
  });

  for (let i = 0; i < 50; ++i) {
    setTimeout(async() => {
      const name = names[_.random(0, names.length - 1)];
      callContext.enter({ name });
      // for testing callback
      UserModel.find({ name }, (err, data) => {
        ++findCallbackCounter;
        data = data[0];
        const store = callContext.get();
        if (data.name !== store.name) {
          console.error(`[ERROR] ${findCallbackCounter}: post-find-in-callback`, data.name, store.name);
        } else {
          console.log(`[OK] ${findCallbackCounter}: post-find-in-callback`);
        }
      });

      // for tesing promise
      let data = await UserModel.find({ name }).exec();
      ++findPromiseCounter;

      data = data[0];
      const store = callContext.get();
      if (data.name !== store.name) {
        console.error(`[ERROR] ${findPromiseCounter}: post-find-in-promise`, data.name, store.name);
      } else {
        console.log(`[OK] ${findPromiseCounter}: post-find-in-promise`);
      }
    }, _.random(10, 50));
  }
})();

const exit = () => {
  if (createCounter === 50 && findCallbackCounter === 50 && findPromiseCounter === 50) {
    process.exit(0);
  } else {
    setTimeout(exit, 100);
  }
};

exit();
