mongoose = require('mongoose').Mongoose
mocks = require('tests')
conn = require('./lib/connection')

describe 'Connection'
  
  describe 'Collections'
    
    it 'should return a Collection'
      db = mongoose.connect('mongodb://localhost/test')
      db.collection('tests').should.be_an_instance_of conn.Collection
    end
    
    it 'should singleton the collections'
      db = mongoose.connect('mongodb://localhost/test')
      test1 = db.collection('tests')
      test2 = db.collection('tests')
      test1.should.be test2
    end
    
    it 'should queue MongoDB/Collection methods if the collection is not ready'
      db = mongoose.connect('mongodb://localhost/test')
      tests = db.collection('tests')
      tests._collection = null
      
      tests.insert({})
      tests._queued.length.should.be 1
      tests._queued[0][0].should.be 'insert'
      
      tests.save({})
      tests._queued.length.should.be 2
      tests._queued[1][0].should.be 'save'
    end
    
    it 'should clear the queue when `collection` is set'
      db = mongoose.connect('mongodb://localhost/test')
      tests = db.collection('tests-2')
      tests._collection = null
      
      tests.insert({})
      tests.remove({})
      tests.save({})
      
      tests._queued.length.should.be 3
      tests.setCollection(new mocks.MockCollection)
      tests._queued.length.should.be 0
    end
    
  end
  
  describe 'Collection Indexes'
    
    it 'should transform simple indexes into the mongodb syntax'
      var db = mongoose.connect('mongodb://localhost/index1'),
          collection = db.collection('index1')
      collection._collection = null
      collection.setIndexes([
        'name',
        {name: 1, last: 1},
        [{name: 1, last: 1}, {unique: true}]
      ])
      collection._queued.length.should.be 3
      collection._queued[0][1][0].should.eql [['name', 1]]
      collection._queued[0][1][1].should.be_undefined
      collection._queued[1][1][0].should.eql [['name', 1], ['last', 1]]
      collection._queued[1][1][1].should.be_undefined
      collection._queued[2][1][0].should.eql [['name', 1], ['last', 1]]
      collection._queued[2][1][1].should.be true
    end
    
  end
  
  describe 'Models'
    
    it 'should compile classes for each Connection'
      mongoose.model('Admin', {
        properties: ['name', ['likes'], ['dislikes'], [{blogposts: ['name', 'body']}], 'last'],
        methods: {
          newMethod: function(){}
        }
      })
      db = mongoose.connect('mongodb://localhost/conn')
      User = db.model('Admin')
      
      db = mongoose.connect('mongodb://localhost/conn2')
      User2 = db.model('Admin')
      
      User._connection.should.not.equal User2.connection
      User.prototype._connection.should.not.equal User2.prototype._connection
    end
    
  end
  
end