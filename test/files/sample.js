'use strict';
import mongoose from '../../browser.js';

const doc = new mongoose.Document({}, new mongoose.Schema({
  name: String
}));
console.log(doc.validateSync());
