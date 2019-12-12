'use strict';
import mongoose from './dist/browser.umd.js';

const doc = new mongoose.Document({}, new mongoose.Schema({
  name: String
}));
console.log(doc.validateSync());
