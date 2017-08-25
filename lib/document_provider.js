'use strict';

/* eslint-env browser */

/*!
 * Module dependencies.
 */
var Document = require('./document.js');
var BrowserDocument = require('./browserDocument.js');

var isBrowser = false;

/**
 * Returns the Document constructor for the current context
 *
 * @api private
 */
module.exports = function() {
  if (isBrowser) {
    return BrowserDocument;
  }
  return Document;
};

/*!
 * ignore
 */
module.exports.setBrowser = function(flag) {
  isBrowser = flag;
};
