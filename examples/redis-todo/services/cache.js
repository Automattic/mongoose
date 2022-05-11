'use strict';

const mongoose = require('mongoose');
const redis = require('redis');

// setting up redis server
const client = redis.createClient();
client.connect().then();
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function(options = {}) {
  this.useCache = true;
  // setting up primary user key
  this.hashKey = JSON.stringify(options.key || '');
  return this;
};

mongoose.Query.prototype.exec = async function() {
  if (!this.useCache) return exec.apply(this, arguments);

  // setting up query key
  const key = JSON.stringify(Object.assign({},
    this.getQuery(), { collection: this.mongooseCollection.name })
  );

  // looking for cache
  const cacheData = await client.hGet(this.hashKey, key).catch((err) => console.log(err));
  if (cacheData) {
    console.log('from redis');
    const doc = JSON.parse(cacheData);
    // inserting doc to make as actual mongodb query
    return Array.isArray(doc) ? doc.map(d => new this.model(d)) : new this.model(doc);
  }

  const result = await exec.apply(this, arguments);
  client.hSet(this.hashKey, key, JSON.stringify(result));
  return result;
};

module.exports = {
  clearCache(hashKey) {
    client.del(JSON.stringify(hashKey));
  }
};
