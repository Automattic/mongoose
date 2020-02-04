'use strict';
const mongoose = require('./');
const assert = require('assert');
const {Schema} = mongoose;

mongoose.SchemaTypes.String.set('trim',true);
mongoose.SchemaTypes.String.set('required',true);
mongoose.SchemaTypes.String.set('someRandomOption','hello mama');

const userSchema = new Schema({ name: { type: String} });
assert.ok(userSchema.path('name').options.trim === true);
assert.ok(userSchema.path('name').options.required === true);
assert.ok(userSchema.path('name').options.someRandomOption === 'hello mama');