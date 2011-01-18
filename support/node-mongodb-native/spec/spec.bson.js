//
//  Tests for BSON protocol, modeled after test_bson.rb
//
describe 'BSON'
  before_each
  end
  
  describe 'BSON'
    it 'Should Correctly Deserialize object'
      var bytes = [95,0,0,0,2,110,115,0,42,0,0,0,105,110,116,101,103,114,97,116,105,111,110,95,116,101,115,116,115,95,46,116,101,115,116,95,105,110,100,101,120,95,105,110,102,111,114,109,97,116,105,111,110,0,8,117,110,105,113,117,101,0,0,3,107,101,121,0,12,0,0,0,16,97,0,1,0,0,0,0,2,110,97,109,101,0,4,0,0,0,97,95,49,0,0];
      var serialized_data = '';
      // Convert to chars
      for(var i = 0; i < bytes.length; i++) {
        serialized_data = serialized_data + mongo.BinaryParser.fromByte(bytes[i]);
      }
      var object = mongo.BSON.deserialize(serialized_data);
      object.name.should.eql "a_1"
      object.unique.should.eql false
      object.key.a.should.eql 1
    end
        
    it 'Should Correctly Deserialize object with all types'
      var bytes = [26,1,0,0,7,95,105,100,0,161,190,98,75,118,169,3,0,0,3,0,0,4,97,114,114,97,121,0,26,0,0,0,16,48,0,1,0,0,0,16,49,0,2,0,0,0,16,50,0,3,0,0,0,0,2,115,116,114,105,110,103,0,6,0,0,0,104,101,108,108,111,0,3,104,97,115,104,0,19,0,0,0,16,97,0,1,0,0,0,16,98,0,2,0,0,0,0,9,100,97,116,101,0,161,190,98,75,0,0,0,0,7,111,105,100,0,161,190,98,75,90,217,18,0,0,1,0,0,5,98,105,110,97,114,121,0,7,0,0,0,2,3,0,0,0,49,50,51,16,105,110,116,0,42,0,0,0,1,102,108,111,97,116,0,223,224,11,147,169,170,64,64,11,114,101,103,101,120,112,0,102,111,111,98,97,114,0,105,0,8,98,111,111,108,101,97,110,0,1,15,119,104,101,114,101,0,25,0,0,0,12,0,0,0,116,104,105,115,46,120,32,61,61,32,51,0,5,0,0,0,0,3,100,98,114,101,102,0,37,0,0,0,2,36,114,101,102,0,5,0,0,0,116,101,115,116,0,7,36,105,100,0,161,190,98,75,2,180,1,0,0,2,0,0,0,10,110,117,108,108,0,0]
      var serialized_data = ''
      // Convert to chars
      for(var i = 0; i < bytes.length; i++) {
        serialized_data = serialized_data + mongo.BinaryParser.fromByte(bytes[i])
      }
      var object = mongo.BSON.deserialize(serialized_data)
      object.string.should.eql "hello"
      object.array.should.eql [1,2,3]
      object.hash.a.should.eql 1
      object.hash.b.should.eql 2
      object.date.should.not.be_null
      object.oid.should.not.be_null()
      object.binary.should.not.be_null()
      object.int.should.eql 42
      object.float.should.eql 33.3333
      object.regexp.should.not.be_null()
      object.boolean.should.eql true
      object.where.should.not.be_null()
      object.dbref.should.not.be_null()
      object['null'].should.be_null()
    end
    
    it 'Should Serialize and Deserialze String'
      var test_string = {hello: 'world'}
      var serialized_data = mongo.BSON.serialize(test_string)
      test_string.should.eql mongo.BSON.deserialize(serialized_data)
    end
    
    it 'Should Correctly Serialize and Deserialize Integer'
      var test_number = {doc: 5}
      var serialized_data = mongo.BSON.serialize(test_number)
      test_number.doc.should.eql mongo.BSON.deserialize(serialized_data).doc
    end    
    
    it 'Should Correctly Serialize and Deserialize null value'
      var test_null = {doc:null}
      var serialized_data = mongo.BSON.serialize(test_null)
      var object = mongo.BSON.deserialize(serialized_data)
      object.doc.should.be_null
    end
    
    it 'Should Correctly Serialize and Deserialize Number'
      var test_number = {doc: 5.5}
      var serialized_data = mongo.BSON.serialize(test_number)
      test_number.should.eql mongo.BSON.deserialize(serialized_data)
    end
    
    it 'Should Correctly Serialize and Deserialize Integer'
      var test_int = {doc: 42}
      var serialized_data = mongo.BSON.serialize(test_int)
      test_int.doc.should.eql mongo.BSON.deserialize(serialized_data).doc
    
      test_int = {doc: -5600}
      serialized_data = mongo.BSON.serialize(test_int)
      test_int.doc.should.eql mongo.BSON.deserialize(serialized_data).doc
    
      test_int = {doc: 2147483647}
      serialized_data = mongo.BSON.serialize(test_int)
      test_int.doc.should.eql mongo.BSON.deserialize(serialized_data).doc
          
      test_int = {doc: -2147483648}
      serialized_data = mongo.BSON.serialize(test_int)
      test_int.doc.should.eql mongo.BSON.deserialize(serialized_data).doc
    end
    
    it 'Should Correctly Serialize and Deserialize Object'
      var doc = {doc: {age: 42, name: 'Spongebob', shoe_size: 9.5}}
      var serialized_data = mongo.BSON.serialize(doc)
      doc.doc.age.should.eql mongo.BSON.deserialize(serialized_data).doc.age
      doc.doc.name.should.eql mongo.BSON.deserialize(serialized_data).doc.name
      doc.doc.shoe_size.should.eql mongo.BSON.deserialize(serialized_data).doc.shoe_size
    end
    
    it 'Should Correctly Serialize and Deserialize Array'
      var doc = {doc: [1, 2, 'a', 'b']}
      var serialized_data = mongo.BSON.serialize(doc)
      var deserialized = mongo.BSON.deserialize(serialized_data);
      doc.doc.should.eql deserialized.doc
    end   
    
    it 'Should Correctly Serialize and Deserialize Array with added on functions'
      Array.prototype.toXml = function() {}    
      var doc = {doc: [1, 2, 'a', 'b']}
      var serialized_data = mongo.BSON.serialize(doc)
      var deserialized = mongo.BSON.deserialize(serialized_data);
      doc.doc.should.eql deserialized.doc
    end   
    
    it 'Should Correctly Serialize and Deserialize A Boolean'
      var doc = {doc: true}
      var serialized_data = mongo.BSON.serialize(doc)
      doc.should.eql mongo.BSON.deserialize(serialized_data)
    end
    
    it 'Should Correctly Serialize and Deserialize a Date'
      var date = new Date()
      //(2009, 11, 12, 12, 00, 30)
      date.setUTCDate(12)
      date.setUTCFullYear(2009)
      date.setUTCMonth(11 - 1)
      date.setUTCHours(12)
      date.setUTCMinutes(0)
      date.setUTCSeconds(30)
      var doc = {doc: date}
      var serialized_data = mongo.BSON.serialize(doc)
      doc.date.should.eql mongo.BSON.deserialize(serialized_data).date      
    end    
        
    it 'Should Correctly Serialize and Deserialize Oid'
      var doc = {doc: new mongo.ObjectID()}
      var serialized_data = mongo.BSON.serialize(doc)
      doc.should.eql mongo.BSON.deserialize(serialized_data)
    end    
        
    it 'Should Correctly encode Empty Hash'
      var test_code = {}
      var serialized_data = mongo.BSON.serialize(test_code)
      test_code.should.eql mongo.BSON.deserialize(serialized_data)
    end        
    
    it 'Should Correctly Serialize and Deserialize Ordered Hash'
      var doc = {doc: new mongo.OrderedHash().add('b', 1).add('a', 2).add('c', 3).add('d', 4)};
      var serialized_data = mongo.BSON.serialize(doc)
      var decoded_hash = mongo.BSON.deserialize(serialized_data).doc
      var keys = []
      for(name in decoded_hash) keys.push(name)
      keys.should.eql ['b', 'a', 'c', 'd']      
    end
    
    it 'Should Correctly Serialize and Deserialize Regular Expression'
      // Serialize the regular expression
      var doc = {doc: /foobar/mi}
      var serialized_data = mongo.BSON.serialize(doc)
      var doc2 = mongo.BSON.deserialize(serialized_data)
      doc.should.eql doc2         
      doc.doc.toString().should.eql doc2.doc.toString()
    end
    
    it 'Should Correctly Serialize and Deserialize a Binary object'
      var bin = new mongo.Binary()
      var string = 'binstring'
      for(var index = 0; index < string.length; index++) {
        bin.put(string.charAt(index))
      }
      var doc = {doc: bin}
      var serialized_data = mongo.BSON.serialize(doc)
      var deserialized_data = mongo.BSON.deserialize(serialized_data)
      doc.doc.value().should.eql deserialized_data.doc.value()
    end
    
    it 'Should Correctly Serialize and Deserialize a big Binary object'
      var data = fs.readFileSync("./integration/test_gs_weird_bug.png", 'binary');
      var bin = new mongo.Binary()
      bin.write(data)
      var doc = {doc: bin}
      var serialized_data = mongo.BSON.serialize(doc)
      var deserialized_data = mongo.BSON.deserialize(serialized_data)
      doc.doc.value().should.eql deserialized_data.doc.value()
    end
    
    it "Should Correctly Serialize and Deserialize DBRef"
      var oid = new mongo.ObjectID()
      var doc = {}
      doc['dbref'] = new mongo.DBRef('namespace', oid, null)      
      var serialized_data = mongo.BSON.serialize(doc)
      var doc2 = mongo.BSON.deserialize(serialized_data)
      doc2.dbref.should.be_an_instance_of mongo.DBRef
      doc2.dbref.namespace.should.eql 'namespace'
      doc2.dbref.oid.should.eql oid
    end
    
    it 'Should Correctly Serialize and Deserialize Long Integer'
      var test_int = {doc: mongo.Long.fromNumber(9223372036854775807)}
      var serialized_data = mongo.BSON.serialize(test_int)
      var deserialized_data = mongo.BSON.deserialize(serialized_data)      
      test_int.doc.equals(deserialized_data.doc).should.eql true
      
      test_int = {doc: mongo.Long.fromNumber(-9223372036854775)}
      serialized_data = mongo.BSON.serialize(test_int)
      deserialized_data = mongo.BSON.deserialize(serialized_data)
      test_int.doc.equals(deserialized_data.doc).should.eql true
      
      test_int = {doc: mongo.Long.fromNumber(-9223372036854775809)}
      serialized_data = mongo.BSON.serialize(test_int)
      deserialized_data = mongo.BSON.deserialize(serialized_data)
      test_int.doc.equals(deserialized_data.doc).should.eql true
    end
    
    it 'Should Always put the id as the first item in a hash'
      var hash = {doc: new mongo.OrderedHash().add('not_id', 1).add('_id', 2)}
      var serialized_data = mongo.BSON.serialize(hash)
      var deserialized_data = mongo.BSON.deserialize(serialized_data)
      var keys = [];
    
      for(name in deserialized_data.doc) {
        keys.push(name);
      }
      
      keys.should.eql ['_id', 'not_id']
    end
    
    it 'Should Correctly Serialize and Deserialize a User defined Binary object'
      var bin = new mongo.Binary()
      bin.sub_type = mongo.BSON.BSON_BINARY_SUBTYPE_USER_DEFINED
      var string = 'binstring'
      for(var index = 0; index < string.length; index++) {
        bin.put(string.charAt(index))
      }
      var doc = {doc: bin}
      var serialized_data = mongo.BSON.serialize(doc)
      var deserialized_data = mongo.BSON.deserialize(serialized_data)
      deserialized_data.doc.sub_type.should.eql mongo.BSON.BSON_BINARY_SUBTYPE_USER_DEFINED
      doc.doc.value().should.eql deserialized_data.doc.value()
    end
    
    it 'Should Correclty Serialize and Deserialize a Code object' 
      var doc = {'doc': new mongo.Code('this.a > i', new mongo.OrderedHash().add('i', 1))};
      var serialized_data = mongo.BSON.serialize(doc)
      var deserialized_data = mongo.BSON.deserialize(serialized_data)
      deserialized_data.doc.code.should.eql(doc.doc.code);
      deserialized_data.doc.scope.i.should.eql(doc.doc.scope.get('i'));
    end
    
    it 'Should Correctly serialize and deserialize and embedded array'
      var doc = {'a':0,
        'b':['tmp1', 'tmp2', 'tmp3', 'tmp4', 'tmp5', 'tmp6', 'tmp7', 'tmp8', 'tmp9', 'tmp10', 'tmp11', 'tmp12', 'tmp13', 'tmp14', 'tmp15', 'tmp16']
      };
    
      var serialized_data = mongo.BSON.serialize(doc)
      var deserialized_data = mongo.BSON.deserialize(serialized_data)
      deserialized_data.a.should.eql doc.a
      deserialized_data.b.should.eql doc.b      
    end
  end
end
