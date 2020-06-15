'use strict';

const sessionNewDocuments = require('../helpers/symbols').sessionNewDocuments;

module.exports = function trackTransaction(schema) {
  schema.pre('save', function() {
    const session = this.$session();
    if (session == null) {
      return;
    }
    if (session.transaction == null || session[sessionNewDocuments] == null) {
      return;
    }

    if (!session[sessionNewDocuments].has(this)) {
      const initialState = {};
      if (this.isNew) {
        initialState.isNew = true;
      }
      if (this.schema.options.versionKey) {
        initialState.versionKey = this.get(this.schema.options.versionKey);
      }

      session[sessionNewDocuments].set(this, initialState);
    }
  });
};