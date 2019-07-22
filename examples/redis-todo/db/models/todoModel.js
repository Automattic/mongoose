'use strict';

const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  userId: { type: mongoose.Types.ObjectId, required: true }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Todo', todoSchema);
