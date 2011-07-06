var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  fs = require('fs'),
  BSON = mongodb.BSON,
  Code = mongodb.Code, 
  Binary = mongodb.Binary,
  Long = mongodb.Long,
  ObjectID = mongodb.ObjectID,
  DBRef = mongodb.DBRef,
  BaseCommand = mongodb.BaseCommand,
  InsertCommand = mongodb.InsertCommand,
  UpdateCommand = mongodb.UpdateCommand,
  DeleteCommand = mongodb.DeleteCommand,
  GetMoreCommand = mongodb.GetMoreCommand,
  KillCursorCommand = mongodb.KillCursorCommand,
  QueryCommand = mongodb.QueryCommand,
  MongoReply = mongodb.MongoReply,
  BinaryParser = mongodb.BinaryParser;

var tests = testCase({
  setUp: function(callback) {
    callback();        
  },
  
  tearDown: function(callback) {
    callback();        
  },

  'Should Correctly Generate an Insert Command' : function(test) {
    var full_collection_name = "db.users";
    var insert_command = new InsertCommand({bson_serializer: {BSON:BSON}}, full_collection_name);
    insert_command.add({name: 'peter pan'});
    insert_command.add({name: 'monkey king'});
    // assert the length of the binary
    test.equal(81, insert_command.toBinary().length);
    test.done();
  },

  'Should Correctly Generate an Update Command' : function(test) {
    var full_collection_name = "db.users";
    var flags = UpdateCommand.DB_UPSERT;
    var selector = {name: 'peter pan'};
    var document = {name: 'peter pan junior'};
    // Create the command
    var update_command = new UpdateCommand({bson_serializer: {BSON:BSON}}, full_collection_name, selector, document, flags);
    // assert the length of the binary
    test.equal(90, update_command.toBinary().length);
    test.done();
  },
  
  'Should Correctly Generate a Delete Command' : function(test) {
    var full_collection_name = "db.users";      
    var selector = {name: 'peter pan'};
    // Create the command
    var delete_command = new DeleteCommand({bson_serializer: {BSON:BSON}}, full_collection_name, selector);
    // assert the length of the binary
    test.equal(58, delete_command.toBinary().length);
    test.done();
  },
  
  'Should Correctly Generate a Get More Command' : function(test) {
    var full_collection_name = "db.users";    
    var numberToReturn = 100;
    var cursorId = Long.fromNumber(10000222);
    // Create the command
    var get_more_command = new GetMoreCommand({bson_serializer: {BSON:BSON}}, full_collection_name, numberToReturn, cursorId);
    // assert the length of the binary
    test.equal(41, get_more_command.toBinary().length);
    test.done();
  },
  
  'Should Correctly Generate a Kill Cursors Command' : function(test) {
    Array.prototype.toXml = function() {}    
    var cursorIds = [Long.fromNumber(1), Long.fromNumber(10000222)];
    // Create the command
    var kill_cursor_command = new KillCursorCommand({bson_serializer: {BSON:BSON}}, cursorIds);
    // assert the length of the binary
    test.equal(40, kill_cursor_command.toBinary().length);
    test.done();
  },
  
  'Should Correctly Generate a Query Command' : function(test) {
    var full_collection_name = "db.users";
    var options = QueryCommand.OPTS_SLAVE;
    var numberToSkip = 100;
    var numberToReturn = 200;
    var query = {name:'peter pan'};
    var query_command = new QueryCommand({bson_serializer: {BSON:BSON}}, full_collection_name, options, numberToSkip, numberToReturn, query, null);
    // assert the length of the binary
    test.equal(62, query_command.toBinary().length);
    // Generate command with return field filter
    query_command = new QueryCommand({bson_serializer: {BSON:BSON}}, full_collection_name, options, numberToSkip, numberToReturn, query, { a : 1, b : 1, c : 1});
    test.equal(88, query_command.toBinary().length);
    test.done();
  },
  
  'Should Correctly Generate and parse a Reply Object' : function(test) {
    var reply_message = BinaryParser.fromInt(0) + BSON.encodeLong(Long.fromNumber(1222)) + BinaryParser.fromInt(100) + BinaryParser.fromInt(2);
    reply_message = reply_message + BSON.serialize({name:'peter pan'}) + BSON.serialize({name:'captain hook'});
    var message = BinaryParser.fromInt(reply_message.length + 4*4) + BinaryParser.fromInt(2) + BinaryParser.fromInt(1) + BinaryParser.fromInt(BaseCommand.OP_QUERY) + reply_message;
    // Parse the message into a proper reply object
    var mongo_reply = new MongoReply({bson_deserializer: {BSON:BSON},
      bson_serializer: {BSON:BSON}}, message);
    test.equal(2, mongo_reply.requestId);
    test.equal(1, mongo_reply.responseTo);
    test.equal(0, mongo_reply.responseFlag);
    test.equal(Long.fromNumber(1222).toString(), mongo_reply.cursorId.toString());
    test.equal(100, mongo_reply.startingFrom);
    test.equal(2, mongo_reply.numberReturned);
    test.equal(2, mongo_reply.documents.length);
    test.deepEqual({name:'peter pan'}, mongo_reply.documents[0]);
    test.deepEqual({name:'captain hook'}, mongo_reply.documents[1]);
    test.done();
  },
});

// Assign out tests
module.exports = tests;