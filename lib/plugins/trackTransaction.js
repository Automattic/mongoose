'use strict';

const sessionNewDocuments = require('../helpers/symbols').sessionNewDocuments;

module.exports = function trackTransaction(schema) {
  schema.pre('save', function() {
    if (!this.isNew) {
      return;
    }

    const session = this.$session();
    if (session == null) {
      return;
    }
    if (session.transaction == null || session[sessionNewDocuments] == null) {
      return;
    }
    session[sessionNewDocuments].push(this);
  });
};