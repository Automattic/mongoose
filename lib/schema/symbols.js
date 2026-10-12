'use strict';

exports.schemaMixedSymbol = Symbol.for('mongoose:schema_mixed');

exports.builtInMiddleware = Symbol.for('mongoose:built-in-middleware');
exports.skipOnSubdocuments = Symbol('mongoose:skip-on-subdocuments');
exports.requiresShardKey = Symbol.for('mongoose:requires-shard-key');
