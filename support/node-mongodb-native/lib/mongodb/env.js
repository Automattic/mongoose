/* 
 * Global database environment - shared across all databases
 */

// Cache of database instances by database name
exports.databases = {};

// Last database that was created
exports.currentdb = null;