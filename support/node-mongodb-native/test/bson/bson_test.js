var mongodb = process.env['TEST_NATIVE'] != null ? require('../../lib/mongodb').native() : require('../../lib/mongodb').pure();

var testCase = require('../../deps/nodeunit').testCase,
  debug = require('util').debug
  inspect = require('util').inspect,
  fs = require('fs'),
  BSON = mongodb.BSON,
  Code = mongodb.Code, 
  Binary = mongodb.Binary,
  Timestamp = mongodb.Timestamp,
  Long = mongodb.Long,
  ObjectID = mongodb.ObjectID,
  DBRef = mongodb.DBRef,
  BinaryParser = mongodb.BinaryParser;

var BSONSE = mongodb,
  BSONDE = mongodb;
  
// BSONDE = require('../../lib/mongodb').native();

// for tests
BSONDE.BSON_BINARY_SUBTYPE_DEFAULT = 0;
BSONDE.BSON_BINARY_SUBTYPE_FUNCTION = 1;
BSONDE.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
BSONDE.BSON_BINARY_SUBTYPE_UUID = 3;
BSONDE.BSON_BINARY_SUBTYPE_MD5 = 4;
BSONDE.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;          

BSONSE.BSON_BINARY_SUBTYPE_DEFAULT = 0;
BSONSE.BSON_BINARY_SUBTYPE_FUNCTION = 1;
BSONSE.BSON_BINARY_SUBTYPE_BYTE_ARRAY = 2;
BSONSE.BSON_BINARY_SUBTYPE_UUID = 3;
BSONSE.BSON_BINARY_SUBTYPE_MD5 = 4;
BSONSE.BSON_BINARY_SUBTYPE_USER_DEFINED = 128;          

var tests = testCase({
  setUp: function(callback) {
    callback();        
  },
  
  tearDown: function(callback) {
    callback();        
  },

  'Should Correctly Deserialize object' : function(test) {
    var bytes = [95,0,0,0,2,110,115,0,42,0,0,0,105,110,116,101,103,114,97,116,105,111,110,95,116,101,115,116,115,95,46,116,101,115,116,95,105,110,100,101,120,95,105,110,102,111,114,109,97,116,105,111,110,0,8,117,110,105,113,117,101,0,0,3,107,101,121,0,12,0,0,0,16,97,0,1,0,0,0,0,2,110,97,109,101,0,4,0,0,0,97,95,49,0,0];
    var serialized_data = '';
    // Convert to chars
    for(var i = 0; i < bytes.length; i++) {
      serialized_data = serialized_data + BinaryParser.fromByte(bytes[i]);
    }
    var object = BSONDE.BSON.deserialize(new Buffer(serialized_data, 'binary'));
    test.equal("a_1", object.name);
    test.equal(false, object.unique);
    test.equal(1, object.key.a);
    test.done();
  },
  
  'Should Correctly Deserialize object with all types' : function(test) {
    var bytes = [26,1,0,0,7,95,105,100,0,161,190,98,75,118,169,3,0,0,3,0,0,4,97,114,114,97,121,0,26,0,0,0,16,48,0,1,0,0,0,16,49,0,2,0,0,0,16,50,0,3,0,0,0,0,2,115,116,114,105,110,103,0,6,0,0,0,104,101,108,108,111,0,3,104,97,115,104,0,19,0,0,0,16,97,0,1,0,0,0,16,98,0,2,0,0,0,0,9,100,97,116,101,0,161,190,98,75,0,0,0,0,7,111,105,100,0,161,190,98,75,90,217,18,0,0,1,0,0,5,98,105,110,97,114,121,0,7,0,0,0,2,3,0,0,0,49,50,51,16,105,110,116,0,42,0,0,0,1,102,108,111,97,116,0,223,224,11,147,169,170,64,64,11,114,101,103,101,120,112,0,102,111,111,98,97,114,0,105,0,8,98,111,111,108,101,97,110,0,1,15,119,104,101,114,101,0,25,0,0,0,12,0,0,0,116,104,105,115,46,120,32,61,61,32,51,0,5,0,0,0,0,3,100,98,114,101,102,0,37,0,0,0,2,36,114,101,102,0,5,0,0,0,116,101,115,116,0,7,36,105,100,0,161,190,98,75,2,180,1,0,0,2,0,0,0,10,110,117,108,108,0,0];
    var serialized_data = '';
    // Convert to chars
    for(var i = 0; i < bytes.length; i++) {
      serialized_data = serialized_data + BinaryParser.fromByte(bytes[i]);
    }

    var object = BSONDE.BSON.deserialize(new Buffer(serialized_data, 'binary'));//, false, true);
    // Perform tests
    test.equal("hello", object.string);
    test.deepEqual([1,2,3], object.array);
    test.equal(1, object.hash.a);
    test.equal(2, object.hash.b);
    test.ok(object.date != null);
    test.ok(object.oid != null);
    test.ok(object.binary != null);
    test.equal(42, object.int);
    test.equal(33.3333, object.float);
    test.ok(object.regexp != null);
    test.equal(true, object.boolean);
    test.ok(object.where != null);
    test.ok(object.dbref != null);
    test.ok(object[null] == null);    
    test.done();
  },
  
  'Should Serialize and Deserialize String' : function(test) {
    var test_string = {hello: 'world'};
    var serialized_data = BSONSE.BSON.serialize(test_string, false, true);
    test.deepEqual(test_string, BSONDE.BSON.deserialize(serialized_data));
    test.done();
  },
  
  'Should Correctly Serialize and Deserialize Integer' : function(test) {    
    var test_number = {doc: 5};
    var serialized_data = BSONSE.BSON.serialize(test_number, false, true);
    test.deepEqual(test_number, BSONDE.BSON.deserialize(serialized_data));
    test.done();
  },
  
  'Should Correctly Serialize and Deserialize null value' : function(test) {
    var test_null = {doc:null};
    var serialized_data = BSONSE.BSON.serialize(test_null, false, true);
    var object = BSONDE.BSON.deserialize(serialized_data);
    test.equal(null, object.doc);
    test.done();
  },
  
  'Should Correctly Serialize and Deserialize Number' : function(test) {
    var test_number = {doc: 5.5};
    var serialized_data = BSONSE.BSON.serialize(test_number, false, true);
    test.deepEqual(test_number, BSONDE.BSON.deserialize(serialized_data));
    test.done();    
  },
  
  'Should Correctly Serialize and Deserialize Integer' : function(test) {
    var test_int = {doc: 42};
    var serialized_data = BSONSE.BSON.serialize(test_int, false, true);
    test.deepEqual(test_int.doc, BSONDE.BSON.deserialize(serialized_data).doc);
  
    test_int = {doc: -5600};
    serialized_data = BSONSE.BSON.serialize(test_int, false, true);
    test.deepEqual(test_int.doc, BSONDE.BSON.deserialize(serialized_data).doc);
  
    test_int = {doc: 2147483647};
    serialized_data = BSONSE.BSON.serialize(test_int, false, true);
    test.deepEqual(test_int.doc, BSONDE.BSON.deserialize(serialized_data).doc);
        
    test_int = {doc: -2147483648};
    serialized_data = BSONSE.BSON.serialize(test_int, false, true);
    test.deepEqual(test_int.doc, BSONDE.BSON.deserialize(serialized_data).doc);
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize Object' : function(test) {
    var doc = {doc: {age: 42, name: 'Spongebob', shoe_size: 9.5}};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
  
    test.deepEqual(doc.doc.age, BSONDE.BSON.deserialize(serialized_data).doc.age);
    test.deepEqual(doc.doc.name, BSONDE.BSON.deserialize(serialized_data).doc.name);
    test.deepEqual(doc.doc.shoe_size, BSONDE.BSON.deserialize(serialized_data).doc.shoe_size);
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize Array' : function(test) {
    var doc = {doc: [1, 2, 'a', 'b']};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized = BSONDE.BSON.deserialize(serialized_data);
  
    test.equal(doc.doc[0], deserialized.doc[0])
    test.equal(doc.doc[1], deserialized.doc[1])
    test.equal(doc.doc[2], deserialized.doc[2])
    test.equal(doc.doc[3], deserialized.doc[3])
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize Array with added on functions' : function(test) {
    Array.prototype.toXml = function() {};
    var doc = {doc: [1, 2, 'a', 'b']};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized = BSONDE.BSON.deserialize(serialized_data);
  
    test.equal(doc.doc[0], deserialized.doc[0])
    test.equal(doc.doc[1], deserialized.doc[1])
    test.equal(doc.doc[2], deserialized.doc[2])
    test.equal(doc.doc[3], deserialized.doc[3])
    test.done();        
  },
  
  'Should correctly deserialize a nested object' : function(test) {
    var doc = {doc: {doc:1}};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
  
    test.deepEqual(doc.doc.doc, BSONDE.BSON.deserialize(serialized_data).doc.doc);
    test.done();            
  },
  
  'Should Correctly Serialize and Deserialize A Boolean' : function(test) {
    var doc = {doc: true};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
  
    test.equal(doc.doc, BSONDE.BSON.deserialize(serialized_data).doc);    
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize a Date' : function(test) {
    var date = new Date();
    //(2009, 11, 12, 12, 00, 30)
    date.setUTCDate(12);
    date.setUTCFullYear(2009);
    date.setUTCMonth(11 - 1);
    date.setUTCHours(12);
    date.setUTCMinutes(0);
    date.setUTCSeconds(30);
    var doc = {doc: date};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
  
    test.equal(doc.date, BSONDE.BSON.deserialize(serialized_data).doc.date);
    test.done();        
  },
  
  'Should Correctly Serialize nested doc' : function(test) {
    var doc = {
      string: "Strings are great",
      decimal: 3.14159265,
      bool: true,
      integer: 5,
  
      subObject: {
        moreText: "Bacon ipsum dolor.",
        longKeylongKeylongKeylongKeylongKeylongKey: "Pork belly."
      },
  
      subArray: [1,2,3,4,5,6,7,8,9,10],
      anotherString: "another string"
    }
  
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    test.done();
  },
       
  'Should Correctly Serialize and Deserialize Oid' : function(test) {
    var doc = {doc: new BSONSE.ObjectID()};
    var doc2 = {doc: BSONDE.ObjectID.createFromHexString(doc.doc.toHexString())};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
  
    test.deepEqual(doc, BSONDE.BSON.deserialize(serialized_data));
    test.done();        
  },
      
  'Should Correctly encode Empty Hash' : function(test) {
    var doc = {};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
  
    test.deepEqual(doc, BSONDE.BSON.deserialize(serialized_data));
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize Ordered Hash' : function(test) {
    var doc = {doc: {b:1, a:2, c:3, d:4}};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var decoded_hash = BSONDE.BSON.deserialize(serialized_data).doc;
    var keys = [];
  
    for(name in decoded_hash) keys.push(name);
    test.deepEqual(['b', 'a', 'c', 'd'], keys);
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize Regular Expression' : function(test) {
    // Serialize the regular expression
    var doc = {doc: /foobar/mi};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var doc2 = BSONDE.BSON.deserialize(serialized_data);
  
    test.deepEqual(doc.doc.toString(), doc2.doc.toString());
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize a Binary object' : function(test) {
    var bin = new Binary();
    var string = 'binstring';
    for(var index = 0; index < string.length; index++) {
      bin.put(string.charAt(index));
    }
    var doc = {doc: bin};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc.doc.value(), deserialized_data.doc.value());
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize a big Binary object' : function(test) {
    var data = fs.readFileSync("test/gridstore/test_gs_weird_bug.png", 'binary');
    var bin = new Binary();
    bin.write(data);
    var doc = {doc: bin};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc.doc.value(), deserialized_data.doc.value());
    test.done();        
  },
  
  "Should Correctly Serialize and Deserialize DBRef" : function(test) {
    var oid = new ObjectID();
    var doc = {dbref: new DBRef('namespace', oid, null)};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
  
    var doc2 = BSONDE.BSON.deserialize(serialized_data);    
    test.equal("namespace", doc2.dbref.namespace);
    test.deepEqual(doc2.dbref.oid.toHexString(), oid.toHexString());
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize partial DBRef' : function(test) {
    var id = new ObjectID();
    var doc = {'name':'something', 'user':{'$ref':'username', '$id': id}};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var doc2 = BSONDE.BSON.deserialize(serialized_data);
    test.equal('something', doc2.name);
    test.equal('username', doc2.user.namespace);
    test.equal(id.toString(), doc2.user.oid.toString());
    test.done();                
  },
  
  'Should Correctly Serialize and Deserialize simple Int' : function(test) {
    var doc = {doc:2147483648};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var doc2 = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc.doc, doc2.doc.toNumber())
    test.done();
  },
  
  'Should Correctly Serialize and Deserialize Long Integer' : function(test) {
    var doc = {doc: Long.fromNumber(9223372036854775807)};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc.doc, deserialized_data.doc);
    
    doc = {doc: Long.fromNumber(-9223372036854775)};
    serialized_data = BSONSE.BSON.serialize(doc, false, true);
    deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc.doc, deserialized_data.doc);
    
    doc = {doc: Long.fromNumber(-9223372036854775809)};
    serialized_data = BSONSE.BSON.serialize(doc, false, true);
    deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc.doc, deserialized_data.doc);
    test.done();        
  },  
    
  'Should Correctly Serialize and Deserialize Long Integer and Timestamp as different types' : function(test) {
    var long = Long.fromNumber(9223372036854775807);
    var timestamp = Timestamp.fromNumber(9223372036854775807);
    test.ok(long instanceof Long);
    test.ok(!(long instanceof Timestamp));
    test.ok(timestamp instanceof Timestamp);
    test.ok(!(timestamp instanceof Long));
    
    var test_int = {doc: long, doc2: timestamp};
    var serialized_data = BSONSE.BSON.serialize(test_int, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
  
    test.deepEqual(test_int.doc, deserialized_data.doc);
    test.done();        
  },
  
  'Should Always put the id as the first item in a hash' : function(test) {
    var hash = {doc: {not_id:1, '_id':2}};
    var serialized_data = BSONSE.BSON.serialize(hash, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    var keys = [];
  
    for(name in deserialized_data.doc) {
      keys.push(name);
    }
    
    test.deepEqual(['not_id', '_id'], keys);
    test.done();        
  },
  
  'Should Correctly Serialize and Deserialize a User defined Binary object' : function(test) {
    var bin = new Binary();
    bin.sub_type = BSON.BSON_BINARY_SUBTYPE_USER_DEFINED;
    var string = 'binstring';
    for(var index = 0; index < string.length; index++) {
      bin.put(string.charAt(index));
    }
  
    var doc = {doc: bin};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    
    test.deepEqual(deserialized_data.doc.sub_type, BSON.BSON_BINARY_SUBTYPE_USER_DEFINED);
    test.deepEqual(doc.doc.value(), deserialized_data.doc.value());
    test.done();        
  },
  
  'Should Correclty Serialize and Deserialize a Code object'  : function(test) {
    var doc = {'doc': {'doc2': new BSONSE.Code('this.a > i', {i:1})}};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    
    test.deepEqual(doc.doc.doc2.code, deserialized_data.doc.doc2.code);
    test.deepEqual(doc.doc.doc2.scope.i, deserialized_data.doc.doc2.scope.i);
    test.done();        
  },
  
  'Should Correctly serialize and deserialize and embedded array' : function(test) {
    var doc = {'a':0,
      'b':['tmp1', 'tmp2', 'tmp3', 'tmp4', 'tmp5', 'tmp6', 'tmp7', 'tmp8', 'tmp9', 'tmp10', 'tmp11', 'tmp12', 'tmp13', 'tmp14', 'tmp15', 'tmp16']
    };
  
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);    
    test.deepEqual(doc.a, deserialized_data.a);
    test.deepEqual(doc.b, deserialized_data.b);
    test.done();        
  },  
  
  'Should Correctly Serialize and Deserialize UTF8' : function(test) {
    // Serialize utf8
    var doc = { "name" : "本荘由利地域に洪水警報", "name1" : "öüóőúéáűíÖÜÓŐÚÉÁŰÍ", "name2" : "abcdedede"};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc, deserialized_data);
    test.done();
  },
  
  'Should Correctly Serialize and Deserialize query object' : function(test) {
    var doc = { count: 'remove_with_no_callback_bug_test', query: {}, fields: null};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);    
    test.deepEqual(doc, deserialized_data);
    test.done();
  },
  
  'Should Correctly Serialize and Deserialize empty query object' : function(test) {
    var doc = {};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc, deserialized_data);
    test.done();
  },
  
  'Should Correctly Serialize and Deserialize array based doc' : function(test) {
    var doc = { b: [ 1, 2, 3 ], _id: new BSONSE.ObjectID() };
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    test.deepEqual(doc.b, deserialized_data.b)
    test.deepEqual(doc, deserialized_data);
    test.done();
  },
  
  'Should handle Deeply nested document' : function(test) {
    var doc = {a:{b:{c:{d:2}}}};
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var deserialized_data = BSONDE.BSON.deserialize(serialized_data);    
    test.deepEqual(doc, deserialized_data);
    test.done();
  },
  
  'Should handle complicated all typed object' : function(test) {
    // First doc
    var date = new Date();
    var oid = new BSONSE.ObjectID();
    var string = 'binstring'
    var bin = new BSONSE.Binary()
    for(var index = 0; index < string.length; index++) {
      bin.put(string.charAt(index))
    }
  
    var doc = {
      'string': 'hello',
      'array': [1,2,3],
      'hash': {'a':1, 'b':2},
      'date': date,
      'oid': oid,
      'binary': bin,
      'int': 42,
      'float': 33.3333,
      'regexp': /regexp/,
      'boolean': true,
      'long': date.getTime(),
      'where': new BSONSE.Code('this.a > i', {i:1}),
      'dbref': new BSONSE.DBRef('namespace', oid, 'integration_tests_')
    }
  
    // Second doc
    var oid = new BSONDE.ObjectID.createFromHexString(oid.toHexString());
    var string = 'binstring'
    var bin = new BSONDE.Binary()
    for(var index = 0; index < string.length; index++) {
      bin.put(string.charAt(index))
    }
  
    var doc2 = {
      'string': 'hello',
      'array': [1,2,3],
      'hash': {'a':1, 'b':2},
      'date': date,
      'oid': oid,
      'binary': bin,
      'int': 42,
      'float': 33.3333,
      'regexp': /regexp/,
      'boolean': true,
      'long': date.getTime(),
      'where': new BSONDE.Code('this.a > i', {i:1}),
      'dbref': new BSONDE.DBRef('namespace', oid, 'integration_tests_')
    }
  
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var serialized_data2 = BSONDE.BSON.serialize(doc2, false, true);
  
    for(var i = 0; i < serialized_data2.length; i++) {
      // debug("[" + i + "] :: " + serialized_data.toString('ascii', i, i+1) + " :: [" + serialized_data[i] + "]" + " = [" + serialized_data2[i] + "] :: " + serialized_data2.toString('ascii', i, i+1))      
      require('assert').equal(serialized_data2[i], serialized_data[i])      
    }
    // 
    // var deserialized_data = BSONDE.BSON.deserialize(serialized_data);
    // 
    // debug("----------------------------------------------------------------- 1")
    // debug(inspect(JSON.stringify(doc)))
    // debug("----------------------------------------------------------------- 2")
    // debug(inspect(JSON.stringify(deserialized_data)))
    // 
    // test.deepEqual(JSON.stringify(doc), JSON.stringify(deserialized_data));
    test.done();    
  },
  
  'Should Correctly Serialize Complex Nested Object' : function(test) {
    var doc = { email: 'email@email.com',
          encrypted_password: 'password',
          friends: [ '4db96b973d01205364000006',
             '4dc77b24c5ba38be14000002' ],
          location: [ 72.4930088, 23.0431957 ],
          name: 'Amit Kumar',
          password_salt: 'salty',
          profile_fields: [],
          username: 'amit',
          _id: new BSONSE.ObjectID() }
          
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    
    var doc2 = doc;
    doc2._id = BSONDE.ObjectID.createFromHexString(doc2._id.toHexString());
    var serialized_data2 = BSONDE.BSON.serialize(doc2, false, true);
  
    for(var i = 0; i < serialized_data2.length; i++) {
      // debug("[" + i + "] :: " + serialized_data.toString('ascii', i, i+1) + " :: [" + serialized_data[i] + "]" + " = [" + serialized_data2[i] + "] :: " + serialized_data2.toString('ascii', i, i+1) 
      //   + ((serialized_data2[i] != serialized_data[i]) ? " = false" : ""))      
      require('assert').equal(serialized_data2[i], serialized_data[i])      
    }
  
    test.done();
  },
  
  'Should correctly massive doc' : function(test) {
    var oid1 = new BSONSE.ObjectID();
    var oid2 = new BSONSE.ObjectID();
  
    // JS doc
    var doc = { dbref2: new BSONSE.DBRef('namespace', oid1, 'integration_tests_'),
         _id: oid2 };
  
    var doc2 = { dbref2: new BSONDE.DBRef('namespace', BSONDE.ObjectID.createFromHexString(oid1.toHexString()), 'integration_tests_'),
        _id: new BSONDE.ObjectID.createFromHexString(oid2.toHexString()) };
  
    // var doc = {
    //   'dbref': new BSONSE.DBRef('namespace', oid, 'integration_tests_')
    // }
    // 
    // var doc2 = {
    //   'dbref': new BSONDE.DBRef('namespace', BSONDE.ObjectID.createFromHexString(oid.toHexString()), 'integration_tests_')
    // }
  
    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var serialized_data2 = BSONDE.BSON.serialize(doc2, false, true);
  
    // for(var i = 0; i < serialized_data2.length; i++) {
    //   debug("[" + i + "] :: " + serialized_data.toString('ascii', i, i+1) + " :: [" + serialized_data[i] + "]" + " = [" + serialized_data2[i] + "] :: " + serialized_data2.toString('ascii', i, i+1) 
    //     + ((serialized_data2[i] != serialized_data[i]) ? " = false" : ""))      
    //   // require('assert').equal(serialized_data2[i], serialized_data[i])      
    // }
    
    test.done();
  },
  
  'Should Correctly Serialize/Deserialize regexp object' : function(test) {
    var doc = {'b':/foobaré/};

    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var serialized_data2 = BSONDE.BSON.serialize(doc, false, true);

    for(var i = 0; i < serialized_data2.length; i++) {
      // debug("[" + i + "] :: " + serialized_data.toString('ascii', i, i+1) + " :: [" + serialized_data[i] + "]" + " = [" + serialized_data2[i] + "] :: " + serialized_data2.toString('ascii', i, i+1) 
      //   + ((serialized_data2[i] != serialized_data[i]) ? " = false" : ""))      
      require('assert').equal(serialized_data2[i], serialized_data[i])      
    }

    test.done();
  },

  'Should Correctly Serialize/Deserialize complicated object' : function(test) {
    var doc = {a:{b:{c:[new BSONSE.ObjectID(), new BSONSE.ObjectID()]}}, d:{f:1332.3323}};

    var serialized_data = BSONSE.BSON.serialize(doc, false, true);
    var doc2 = BSONSE.BSON.deserialize(serialized_data);

    test.deepEqual(doc, doc2)
    test.done();
  }
});

// Assign out tests
module.exports = tests;