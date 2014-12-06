'use strict';

/*!
 * Module dependencies.
 */
var Document = require('./document.js');
var BrowserDocument = require('./browserDocument.js');

/**
 * Returns the Document constructor for the current context
 *
 * @api private
 */
module.exports = function() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && document === window.document) {
    return BrowserDocument;
  } else {
    return Document;
  }
};