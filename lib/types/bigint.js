/**
 * BigInt type constructor
 *
 * #### Example:
 *
 *     const id = new mongoose.Types.BigInt('1099511627776');
 *
 * @constructor BigInt
 */

'use strict';

module.exports = require('bson').Long;
