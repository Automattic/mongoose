'use strict';
const Schema = require('../../../lib').Schema;
const mySchema = Schema({name: String});

/* global db */
module.exports = db.model('MyModel', mySchema);
