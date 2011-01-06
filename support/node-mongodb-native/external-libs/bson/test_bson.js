require.paths.unshift("../../lib");

var sys = require('sys'),
  Buffer = require('buffer').Buffer,
  BSON = require('./bson').BSON,
  Buffer = require('buffer').Buffer,
  BSONJS = require('mongodb/bson/bson').BSON,
  BinaryParser = require('mongodb/bson/binary_parser').BinaryParser,
  Long = require('mongodb/goog/math/long').Long,
  ObjectID = require('mongodb/bson/bson').ObjectID,
  Binary = require('mongodb/bson/bson').Binary,
  Code = require('mongodb/bson/bson').Code,  
  DBRef = require('mongodb/bson/bson').DBRef,  
  assert = require('assert');
  
var Long2 = require('./bson').Long,
    ObjectID2 = require('./bson').ObjectID,
    Binary2 = require('./bson').Binary,
    Code2 = require('./bson').Code,
    DBRef2 = require('./bson').DBRef;
    
sys.puts("=== EXCEUTING TEST_BSON ===");

// Long data type tests
var l2_string = Long2.fromNumber(100);
var l_string = Long.fromNumber(100);
assert.equal(l_string.toNumber(), l2_string.toNumber());

var l2_string = Long2.fromNumber(9223372036854775807).toString();
var l_string = Long.fromNumber(9223372036854775807).toString();
assert.equal(l_string, l2_string);

l2_string = Long2.fromNumber(9223372036800).toString();
l_string = Long.fromNumber(9223372036800).toString();
assert.equal(l_string, l2_string);

l2_string = Long2.fromNumber(2355).toString();
l_string = Long.fromNumber(2355).toString();
assert.equal(l_string, l2_string);

l_string = Long.fromNumber(-9223372036854775807).toString();
l2_string = Long2.fromNumber(-9223372036854775807).toString();
assert.equal(l_string, l2_string);

l2_string = Long2.fromNumber(-2355).toString();
l_string = Long.fromNumber(-2355).toString();
assert.equal(l_string, l2_string);

l2_string = Long2.fromNumber(-1).toString();
l_string = Long.fromNumber(-1).toString();
assert.equal(l_string, l2_string);

l2_string = Long2.fromNumber(1).toString();
l_string = Long.fromNumber(1).toString();
assert.equal(l_string, l2_string);

var a = Long2.fromNumber(10);
assert.equal(10, a);

var a = Long2.fromNumber(9223372036854775807);
assert.equal(9223372036854775807, a);

// Simple serialization and deserialization test for a Single String value
var simple_string_serialized = BSON.serialize({doc:'Serialize'});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

// Simple integer serialization/deserialization test, including testing boundary conditions
var simple_string_serialized = BSON.serialize({doc:-1});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

var simple_string_serialized = BSON.serialize({doc:2147483648});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

var simple_string_serialized = BSON.serialize({doc:-2147483648});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

// Simple serialization and deserialization test for a Long value
var simple_string_serialized = BSON.serialize({doc:Long2.fromNumber(9223372036854775807)});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

var simple_string_serialized = BSON.serialize({doc:Long2.fromNumber(-9223372036854775807)});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

// Simple serialization and deserialization for a Float value
var simple_string_serialized = BSON.serialize({doc:2222.3333});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

var simple_string_serialized = BSON.serialize({doc:-2222.3333});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

// Simple serialization and deserialization for a null value
var simple_string_serialized = BSON.serialize({doc:null});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

// Simple serialization and deserialization for a boolean value
var simple_string_serialized = BSON.serialize({doc:true});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

// Simple serialization and deserialization for a date value
var date = new Date();
var simple_string_serialized = BSON.serialize({doc:date});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')));
assert.deepEqual(BSONJS.deserialize(simple_string_serialized), BSON.deserialize(simple_string_serialized));

// Simple serialization and deserialization for a boolean value
var simple_string_serialized = BSON.serialize({doc:/abcd/mi});
assert.equal(BSONJS.deserialize(simple_string_serialized).doc.toString(), BSON.deserialize(simple_string_serialized).doc.toString());
assert.equal(BSONJS.deserialize(simple_string_serialized).doc.toString(), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')).doc.toString());

var simple_string_serialized = BSON.serialize({doc:/abcd/});
assert.equal(BSONJS.deserialize(simple_string_serialized).doc.toString(), BSON.deserialize(simple_string_serialized).doc.toString());
assert.equal(BSONJS.deserialize(simple_string_serialized).doc.toString(), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')).doc.toString());

// Simple serialization and deserialization for a objectId value
var simple_string_serialized = BSON.serialize({doc:new ObjectID2()});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized).doc.toString(), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')).doc.toString());
assert.deepEqual(BSONJS.deserialize(simple_string_serialized).doc.toString(), BSON.deserialize(simple_string_serialized).doc.toString());

// Simple serialization and deserialization for a Binary value
var binary = new Binary2();
var string = 'binstring'
for(var index = 0; index < string.length; index++) { binary.put(string.charAt(index)); }
var simple_string_serialized = BSON.serialize({doc:binary});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized).doc.value(), BSON.deserialize(new Buffer(simple_string_serialized, 'binary')).doc.value());
assert.deepEqual(BSONJS.deserialize(simple_string_serialized).doc.value(), BSON.deserialize(simple_string_serialized).doc.value());

// Simple serialization and deserialization for a Code value
var code = new Code2('this.a > i', {'i': 1});
var code2 = new Code('this.a > i', {'i': 1});
var simple_string_serialized_2 = BSONJS.serialize({doc:code2});
var simple_string_serialized = BSON.serialize({doc:code});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized_2).doc.scope, BSON.deserialize(new Buffer(simple_string_serialized, 'binary')).doc.scope);
assert.deepEqual(BSONJS.deserialize(simple_string_serialized_2).doc.code, BSON.deserialize(simple_string_serialized).doc.code);

// Simple serialization and deserialization for an Object
var simple_string_serialized = BSON.serialize({doc:{a:1, b:{c:2}}});
var simple_string_serialized_2 = BSONJS.serialize({doc:{a:1, b:{c:2}}});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized_2).doc, BSON.deserialize(new Buffer(simple_string_serialized, 'binary')).doc);
assert.deepEqual(BSONJS.deserialize(simple_string_serialized_2).doc, BSON.deserialize(simple_string_serialized).doc);

// Simple serialization and deserialization for an Array
var simple_string_serialized = BSON.serialize({doc:[9, 9, 1, 2, 3, 1, 1, 1, 1, 1, 1, 1]});
var simple_string_serialized_2 = BSONJS.serialize({doc:[9, 9, 1, 2, 3, 1, 1, 1, 1, 1, 1, 1]});
assert.deepEqual(BSONJS.deserialize(simple_string_serialized_2).doc, BSON.deserialize(new Buffer(simple_string_serialized, 'binary')).doc);
assert.deepEqual(BSONJS.deserialize(simple_string_serialized_2).doc, BSON.deserialize(simple_string_serialized).doc);

// Simple serialization and deserialization for a DBRef
var oid = new ObjectID2()
var simple_string_serialized = BSONJS.serialize({doc:new DBRef('namespace', oid, 'integration_tests_')});
var simple_string_serialized_2 = BSON.serialize({doc:new DBRef2('namespace', oid, 'integration_tests_')});

// Ensure we have the same values for the dbref
var object_js = BSONJS.deserialize(simple_string_serialized_2);
var object_c = BSON.deserialize(simple_string_serialized);
assert.equal(object_js.doc.namespace, object_c.doc.namespace);
assert.equal(object_js.doc.oid.toHexString(), object_c.doc.oid.toHexString());
assert.equal(object_js.doc.db, object_c.doc.db);

// Serialized document
var bytes = [47,0,0,0,2,110,97,109,101,0,6,0,0,0,80,97,116,116,121,0,16,97,103,101,0,34,0,0,0,7,95,105,100,0,76,100,12,23,11,30,39,8,89,0,0,1,0];
var serialized_data = '';
// Convert to chars
for(var i = 0; i < bytes.length; i++) {
  serialized_data = serialized_data + BinaryParser.fromByte(bytes[i]);
}
var object = BSON.deserialize(serialized_data);
assert.equal('Patty', object.name)
assert.equal(34, object.age)
assert.equal('4c640c170b1e270859000001', object._id.toHexString())

// Serialize utf8
var doc = { "name" : "本荘由利地域に洪水警報", "name1" : "öüóőúéáűíÖÜÓŐÚÉÁŰÍ", "name2" : "abcdedede"};
var simple_string_serialized = BSON.serialize(doc);
var object = BSON.deserialize(simple_string_serialized);
assert.equal(doc.name, object.name)
assert.equal(doc.name1, object.name1)
assert.equal(doc.name2, object.name2)

// Serialize object with array
var doc = {b:[1, 2, 3]};
var simple_string_serialized = BSON.serialize(doc);
var simple_string_serialized_2 = BSONJS.serialize(doc);
var object = BSON.deserialize(simple_string_serialized);
assert.deepEqual(doc, object)

// Test equality of an object ID
var object_id = new ObjectID2();
var object_id_2 = new ObjectID2();
assert.ok(object_id.equals(object_id));
assert.ok(!(object_id.equals(object_id_2)))
















