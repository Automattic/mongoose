
/*!
 * Module exports.
 */

'use strict';

exports.Array = require('./array');
exports.Boolean = require('./boolean');
exports.BigInt = require('./bigint');
exports.Buffer = require('./buffer');
exports.Date = require('./date');
exports.Decimal128 = exports.Decimal = require('./decimal128');
exports.DocumentArray = require('./documentarray');
exports.Map = require('./map');
exports.Mixed = require('./mixed');
exports.Number = require('./number');
exports.ObjectId = require('./objectid');
exports.String = require('./string');
exports.Subdocument = require('./SubdocumentPath');
exports.UUID = require('./uuid');

// alias

exports.Oid = exports.ObjectId;
exports.Object = exports.Mixed;
exports.Bool = exports.Boolean;
exports.ObjectID = exports.ObjectId;
