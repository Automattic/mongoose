
'use strict';

const mongoose = require('../..');
const { MongoMemoryServer } = require('mongodb-memory-server');
const uuid = require('uuid').v4;
const _ = require('lodash');
const callContext = require('./callContext');

const pluginSave = (schema) => {
  schema.pre(['save'], function() {
    const contextData = callContext.get();

    // verify asyncLocalStorage
    if (this.name !== contextData.name) {
      console.error('[static-hooks] [pre] [save]', this.name, contextData.name);
    } else {
      console.log('[OK] [static-hooks] [pre] [save]');
    }
  });

  schema.post(['save'], function() {
    const contextData = callContext.get();

    // verify asyncLocalStorage
    if (this.name !== contextData.name) {
      console.error(
        '[ERROR] [static-hooks] [post] [save]',
        this.name,
        contextData.name
      );
    } else {
      console.log('[OK] [static-hooks] [post] [save]');
    }
  });
};

const pluginQuery = (schema) => {
  schema.pre(['find', 'findOne', 'count', 'countDocuments'], function() {
    const contextData = callContext.get();

    // verify asyncLocalStorage
    if (this._conditions.name !== contextData.name) {
      console.error(
        `[ERROR] [static-hooks] [pre] [${this.op}]`,
        this._conditions.name,
        contextData.name
      );
    } else {
      console.log(`[OK] [static-hooks] [pre] [${this.op}]`);
    }
  });

  schema.post(['find', 'findOne', 'count', 'countDocuments'], function() {
    const contextData = callContext.get();

    // verify asyncLocalStorage
    if (this._conditions.name !== contextData.name) {
      console.error(
        `[ERROR] [static-hooks] [post] [${this.op}]`,
        this._conditions.name,
        contextData.name
      );
    } else {
      console.log(`[OK] [static-hooks] [post] [${this.op}]`);
    }
  });
};

const pluginAggregate = (schema) => {
  schema.pre(['aggregate'], function() {
    // Special Case: aggregate should keep store
    const contextData = callContext.get();
    this.__asyncLocalStore = contextData;

    const name = this._pipeline[0].$match.name;

    // verify asyncLocalStorage
    if (name !== contextData.name) {
      console.error(
        '[ERROR] [static-hooks] [pre] [aggregate]',
        name,
        contextData.name
      );
    } else {
      console.log('[OK] [static-hooks] [pre] [aggregate]');
    }
  });

  schema.post(['aggregate'], function() {
    const contextData = this.__asyncLocalStore;
    const name = this._pipeline[0].$match.name;

    // verify asyncLocalStorage
    if (name !== contextData.name) {
      console.error(
        '[ERROR] [static-hooks] [post] [aggregate]',
        name,
        contextData.name
      );
    } else {
      console.log('[OK] [static-hooks] [post] [aggregate]');
    }
  });
};

mongoose.plugin(pluginSave);
mongoose.plugin(pluginQuery);
mongoose.plugin(pluginAggregate);

const docCount = 50;

let createCounter = 0;
let findCallbackCounter = 0;
let findPromiseCounter = 0;
let aggregateCounter = 0;
let countCounter = 0;

const start = function() {
  let userSchema = null;
  let UserModel = null;
  const names = [];

  // // Test in local real mongo sever
  // Promise
  //   .resolve()
  //   .then(() => {
  //     return mongoose.connect('mongodb://test:test@127.0.0.1:27017/test', {
  //       useNewUrlParser: true,
  //       useUnifiedTopology: true
  //     });
  //   })

  // Test in Mongo Memory Server
  const mongod = new MongoMemoryServer();
  mongod
    .getUri()
    .then((uri) => {
      // prepare connection
      return mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    })
    .then((connection) => {
      // prepare model
      userSchema = new mongoose.Schema({ name: String });
      UserModel = connection.model('UserModel', userSchema);
    })
    .then(() => {
      // prepare data
      new Promise((resolve, reject) => {
        for (let i = 0; i < docCount; ++i) {
          const name = uuid();
          names.push(name);
          callContext.enter({ name });

          const user = new UserModel({ name });
          user
            .save()
            .then(() => {
              createCounter++;
              if (createCounter === docCount) {
                resolve();
              }
            })
            .catch(reject);
        }
      });
    })
    .then(() => {
      // testing find callback in style
      return new Promise((resolve, reject) => {
        for (let i = 0; i < docCount; ++i) {
          setTimeout(() => {
            const name = names[i];
            callContext.enter({ name });

            UserModel.find({ name }, (err, data) => {
              if (err) {
                reject(err);
              }

              ++findCallbackCounter;

              data = data[0];
              const contextData = callContext.get();

              // verify asyncLocalStorage
              if (data.name !== contextData.name) {
                console.error(
                  `[ERROR] ${findCallbackCounter}: post-find-in-callback`,
                  data.name,
                  contextData.name
                );
              } else {
                console.log(`[OK] ${findCallbackCounter}: post-find-in-callback`);
              }

              if (findCallbackCounter === docCount) {
                resolve();
              }
            });
          }, _.random(10, 50));
        }
      });
    })
    .then(() => {
      // test find in promise style
      return new Promise((resolve, reject) => {
        for (let i = 0; i < docCount; ++i) {
          setTimeout(() => {
            const name = names[i];
            callContext.enter({ name });

            UserModel
              .find({ name })
              .exec()
              .then(data => {
                ++findPromiseCounter;
                data = data[0];
                const contextData = callContext.get();

                // verify asyncLocalStorage
                if (data.name !== contextData.name) {
                  console.error(
                    `[ERROR] ${findPromiseCounter}: post-find-in-promise`,
                    data.name,
                    contextData.name
                  );
                } else {
                  console.log(`[OK] ${findPromiseCounter}: post-find-in-promise`);
                }

                if (findPromiseCounter === docCount) {
                  resolve();
                }
              })
              .catch(reject);
          }, _.random(10, 50));
        }
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        for (let i = 0; i < docCount; ++i) {
          setTimeout(() => {
            const name = names[i];
            callContext.enter({ name });

            // aggregate
            UserModel
              .aggregate([{ $match: { name: name } }], (err, data) => {
                if (err) {
                  reject(err);
                }

                ++aggregateCounter;
                const contextData = callContext.get();
                data = data[0];

                // verify asyncLocalStorage
                if (data.name !== contextData.name) {
                  console.error(
                    `[ERROR] ${findCallbackCounter}: post-aggregate-in-callback`,
                    data.name,
                    contextData.name
                  );
                } else {
                  console.log(
                    `[OK] ${findCallbackCounter}: post-aggregate-in-callback`
                  );
                }

                if (aggregateCounter === docCount) {
                  resolve();
                }
              });
          }, _.random(10, 50));
        }
      });
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        for (let i = 0; i < docCount; ++i) {
          setTimeout(() => {
            const name = names[i];
            callContext.enter({ name });

            UserModel
              .countDocuments({ name })
              .exec()
              .then(() => {
                ++countCounter;

                if (countCounter === docCount) {
                  resolve();
                }
              })
              .catch(reject);
          }, _.random(10, 50));
        }
      });
    });

  const exit = () => {
    if (
      createCounter === docCount &&
      findCallbackCounter === docCount &&
      findPromiseCounter === docCount &&
      aggregateCounter === docCount &&
      countCounter === docCount
    ) {
      process.exit(0);
    } else {
      setTimeout(exit, 1000);
    }
  };

  exit();
};

module.exports.start = start;
