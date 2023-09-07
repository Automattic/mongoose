
/*!
 * Module exports.
 */

'use strict';

exports.Array = require('./Array');
exports.BigInt = require('./BigInt');
exports.Boolean = require('./Boolean');
exports.Buffer = require('./Buffer');
exports.Date = require('./Date');
exports.Decimal128 = exports.Decimal = require('./Decimal128');
exports.DocumentArray = require('./DocumentArray');
exports.Map = require('./Map');
exports.Mixed = require('./Mixed');
exports.Number = require('./Number');
exports.ObjectId = require('./ObjectId');
exports.String = require('./String');
exports.Subdocument = require('./Subdocument');
exports.UUID = require('./UUID');

// alias

exports.Oid = exports.ObjectId;
exports.Object = exports.Mixed;
exports.Bool = exports.Boolean;
exports.ObjectID = exports.ObjectId;
