/**
 * BigInt type constructor
 *
 * #### Example:
 *
 *     const id = new mongoose.Types.BigInt('10n');
 *
 * @constructor BigInt
 */

'use strict';

module.exports = require('bson').Long;
