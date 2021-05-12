
'use strict';

const mongoose = require("../..");
const { MongoMemoryServer } = require("mongodb-memory-server");
const uuid = require("uuid").v4;
const _ = require("lodash");
const callContext = require("./callContext");

const pluginSave = (schema) => {
  schema.pre(["save"], function () {
    const contextData = callContext.get();

    if (this.name !== contextData.name) {
      console.error("[static-hooks] [pre] [save]", this.name, contextData.name);
    } else {
      console.log("[OK] [static-hooks] [pre] [save]");
    }
  });

  schema.post(["save"], function () {
    const contextData = callContext.get();

    if (this.name !== contextData.name) {
      console.error(
        "[ERROR] [static-hooks] [post] [save]",
        this.name,
        contextData.name
      );
    } else {
      console.log("[OK] [static-hooks] [post] [save]");
    }
  });
};

const pluginQuery = (schema) => {
  schema.pre(["find", "findOne", "count", "countDocuments"], function () {
    const contextData = callContext.get();

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

  schema.post(["find", "findOne", "count", "countDocuments"], function () {
    const contextData = callContext.get();
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
  schema.pre(["aggregate"], function () {
    // Special Case: aggregate should keep store
    const contextData = callContext.get();
    this.__asyncLocalStore = contextData;

    const name = this._pipeline[0].$match.name;
    // verification
    if (name !== contextData.name) {
      console.error(
        "[ERROR] [static-hooks] [pre] [aggregate]",
        name,
        contextData.name
      );
    } else {
      console.log("[OK] [static-hooks] [pre] [aggregate]");
    }
  });

  schema.post(["aggregate"], function () {
    const contextData = this.__asyncLocalStore;
    const name = this._pipeline[0].$match.name;

    if (!contextData) {
      console.log("[ERROR] [static-hooks] [post] [aggregate] undifined");
    }

    // verification
    if (name !== contextData.name) {
      console.error(
        "[ERROR] [static-hooks] [post] [aggregate]",
        name,
        contextData.name
      );
    } else {
      console.log("[OK] [static-hooks] [post] [aggregate]");
    }
  });
};

mongoose.plugin(pluginSave);
mongoose.plugin(pluginQuery);
mongoose.plugin(pluginAggregate);

let createCounter = 0;
let findCallbackCounter = 0;
let findPromiseCounter = 0;
let aggregateCounter = 0;
let countCounter = 0;

const docCount = 50;

const start = async () => {
  const mongod = new MongoMemoryServer();
  const uri = await mongod.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const userSchema = new mongoose.Schema({ name: String });
  const UserModel = mongoose.model("UserModel", userSchema);

  const names = [];

  // prepare data
  await new Promise(async (resolve, reject) => {
    for (let i = 0; i < docCount; ++i) {
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

      if (createCounter === docCount) {
        resolve();
      }
    }
  });

  for (let i = 0; i < docCount; ++i) {
    setTimeout(async () => {
      const name = names[i];
      callContext.enter({ name });

      // for testing callback
      UserModel.find({ name }, (err, data) => {
        ++findCallbackCounter;
        data = data[0];
        const store = callContext.get();
        if (data.name !== store.name) {
          console.error(
            `[ERROR] ${findCallbackCounter}: post-find-in-callback`,
            data.name,
            store.name
          );
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
        console.error(
          `[ERROR] ${findPromiseCounter}: post-find-in-promise`,
          data.name,
          store.name
        );
      } else {
        console.log(`[OK] ${findPromiseCounter}: post-find-in-promise`);
      }

      // aggregate
      UserModel.aggregate([{ $match: { name: name } }], (err, data) => {
        const store = callContext.get();
        data = data[0];
        if (data.name !== store.name) {
          console.error(
            `[ERROR] ${findCallbackCounter}: post-aggregate-in-callback`,
            data.name,
            store.name
          );
        } else {
          console.log(
            `[OK] ${findCallbackCounter}: post-aggregate-in-callback`
          );
        }
        ++aggregateCounter;
      });

      await UserModel.countDocuments({ name }).exec();
      ++countCounter;
    }, _.random(10, 50));
  }

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

    // if (aggregateCounter === docCount) {
    //     process.exit(0);
    //   } else {
    //     setTimeout(exit, 1000);
    //   }
  };

  exit();
};

module.exports.start = start;
