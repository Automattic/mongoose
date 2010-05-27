
describe 'Mongoose'
  before_each
  end
  
  describe 'URI Parsing'
    it 'should return basic connection parsed object'
      var parsed = mongoose.parseURI('mongodb://localhost/test');
      parsed.should.have_length 1
      parsed[0].type.should.equal 'mongodb'
      parsed[0].user.should.be_undefined
      parsed[0].password.should.be_undefined
      parsed[0].host.should.equal 'localhost'
      parsed[0].port.should.equal 27017
      parsed[0].db.should.equal 'test'
    end
    
    it 'should handle username/password and port being explicitly defined'
      var parsed = mongoose.parseURI('mongodb://user:pass@localhost:33333/test');
      parsed[0].user.should.equal 'user'
      parsed[0].password.should.equal 'pass'
      parsed[0].port.should.equal 33333
    end
    
    it 'should handle multiple servers defined'
      var parsed = mongoose.parseURI('mongodb://server1.com:1234/db1,user:pass@server2.com/db3');
      parsed.should.have_length 2
      parsed[0].host.should.equal 'server1.com'
      parsed[0].db.should.equal 'db1'
      parsed[1].type.should.equal 'mongodb'
      parsed[1].user.should.equal 'user'
      parsed[1].password.should.equal 'pass'
      parsed[1].host.should.equal 'server2.com'
      parsed[1].port.should.equal 27017
      parsed[1].db.should.equal 'db3'
      
      parsed = mongoose.parseURI('mongodb://localhost/db,localhost:27018/db,mongodb://localhost:27019/db');
      parsed.should.have_length 3
      parsed[0].host.should.equal 'localhost'
      parsed[1].host.should.equal 'localhost'
      parsed[2].host.should.equal 'localhost'
      parsed[0].port.should.equal 27017
      parsed[1].port.should.equal 27018
      parsed[2].port.should.equal 27019
      parsed[0].db.should.equal 'db'
      parsed[1].db.should.equal 'db'
      parsed[2].db.should.equal 'db'
    end
    
  end
end