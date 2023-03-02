
/*!
 * Module exports.
 */

'use strict';

exports.String = require('./string');

exports.Number = require('./number');

exports.BigInt = require('./bigint');

exports.Boolean = require('./boolean');

exports.DocumentArray = require('./documentarray');

exports.Subdocument = require('./SubdocumentPath');

exports.Array = require('./array');

exports.Buffer = require('./buffer');

exports.Date = require('./date');

exports.ObjectId = require('./objectid');

exports.Mixed = require('./mixed');

exports.Decimal128 = exports.Decimal = require('./decimal128');

exports.Map = require('./map');

exports.UUID = require('./uuid');

// alias

exports.Oid = exports.ObjectId;
exports.Object = exports.Mixed;
exports.Bool = exports.Boolean;
exports.ObjectID = exports.ObjectId;
