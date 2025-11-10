/**
 * UUID type constructor
 *
 * #### Example:
 *
 *     const id = new mongoose.Types.UUID();
 *
 * @constructor UUID
 */

'use strict';

module.exports = require('mongodb/lib/bson').UUID;
