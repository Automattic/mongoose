var sys = require('sys')
// // Add both the BSON Pure classes and the native ones
var BSONPure = exports.BSONPure = require('./bson/bson');
var BSONNative = null
try {
  BSONNative = exports.BSONNative = require('../../external-libs/bson/bson');
} catch(err) {
}

[
	'bson/binary_parser',
	
	'commands/base_command', 'commands/db_command', 'commands/delete_command',
	'commands/get_more_command', 'commands/insert_command', 'commands/kill_cursor_command',
	'commands/query_command', 'commands/update_command',
	
	'responses/mongo_reply',
	
	'admin', 'collection', 'connection', 'cursor', 'db',
	
	'goog/math/integer', 'goog/math/long', 'crypto/md5',
	'gridfs/chunk', 'gridfs/gridstore'
].forEach(function(path){
	var module = require('./' + path);
	for (var i in module)
		exports[i] = module[i];
});
