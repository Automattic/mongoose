'use strict';
const model = require('./modelA');

exports.home = async(req, res, next) => {
  try {
    const docs = await model.find();
    res.send(docs);
  } catch (err) {
    next(err);
  }
};

exports.modelName = (req, res) => {
  res.send('my model name is ' + model.modelName);
};

exports.insert = async(req, res, next) => {
  try {
    const doc = await model.create({ name: 'inserting ' + Date.now() });
    res.send(doc);
  } catch (err) {
    next(err);
  }
};
