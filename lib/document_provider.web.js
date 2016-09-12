'use strict';

/* eslint-env browser */

/*!
 * Module dependencies.
 */
var BrowserDocument = require('./browserDocument.js');

/**
 * Returns the Document constructor for the current context
 *
 * @api private
 */
module.exports = function() {
  return BrowserDocument;
};
