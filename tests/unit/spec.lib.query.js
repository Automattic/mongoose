query = require('./lib/query')
Promise = query.Promise
Writer = query.Writer
ObjectID = require('mongodb').ObjectID

describe 'Query'
  
  describe 'Writer'
    
    it 'should add options'
      writer = new Writer()
      writer.limit(5).sort(['test', 1]).group('name')
      writer._options.limit.should.be 5
      writer._options.sort.length.should.be 2
      writer._options.group.should.be 'name'
    end
    
    it 'should combine options and modifiers'
      writer = new Writer()
      writer.where('something', 'else').limit(5).group('name').where('is', 'ok').sort(['test', 1])
      writer._options.limit.should.be 5
      writer._options.sort.length.should.be 2
      writer._options.group.should.be 'name'
    end
    
    it 'should create a query object'
      writer = new Writer()
      writer.where('something', 'ok')
      writer._query.something.should.be 'ok'
    end
    
    it 'should cast object ids in the query object'
      writer = new Writer();
      writer.where('_something', '4c1781fae728161040ce6293');
      writer.where('_else', ObjectID.createFromHexString('4c1781fae728161040ce6293'));
      writer._query._something.should.be_an ObjectID
      writer._query._else.should.be_an ObjectID
    end
    
    it 'should support objects for the where modifier'
      writer = new Writer()
      writer.where({something: 'ok', cool: 'yes'})
      writer._query.something.should.be 'ok'
      writer._query.cool.should.be 'yes'
    end
    
    it 'should return a promise if executed'
      writer = new Writer()
      writer.where({something: 'ok', cool: 'yes'})
      writer.exec().should.be_an_instance_of Promise
    end
    
    it 'should return the same promise if executed twice'
      writer = new Writer()
      writer.where({something: 'ok', cool: 'yes'})
      promise = writer.exec()
      promise2 = writer.exec()
      promise.should.equal promise2
    end
    
    it 'should execute and return a promise when a promise method is called'
      writer = new Writer()
      writer.get().should.be_an_instance_of Promise
    end
    
    it 'should execute and return a promise when a promise method is called twice'
      writer = new Writer()
      promise = writer.get()
      promise2 = writer.one()
      promise.should.equal promise2
    end
    
  end
  
  describe 'Promise'
    
    it 'should queue the calls'
      first_func = function(){ }
      second_func = function(){ }
      promise = new Promise()
      promise.get(first_func)
      promise.last(second_func)
      promise._queues[0].length.should.be 2
      promise._queues[0][0][0].should.be 'get'
      promise._queues[0][0][1][0].should.be first_func
      promise._queues[0][1][0].should.be 'last'
      promise._queues[0][1][1][0].should.be second_func
    end
    
    it 'should clear the queue after completing'
      promise = new Promise()
      promise.get(function(){})
      promise.complete([]);
      promise._queues[0].should.be_null
      promise.get(function(){})
      promise._queues[0].should.be_null
    end
    
    it 'should stash'
      promise = new Promise();
      promise.get(function(){});
      promise.one(function(){})
      
      promise.stash()
      promise._queues[0].length.should.be 2
      promise._queues[1].should.be_an Array
      
      promise.get(function(){})
      promise.first(function(){})
      promise.last(function(){})
      
      promise._queues[0].length.should.be 2
      promise._queues[1].length.should.be 3
      
      promise.complete([])
      
      promise._queues[0].should.be_null
      promise._queues[1].length.should.be 3
      
      promise.complete([])
      
      promise._queues[1].should.be_null
      
      promise.first(function(){})
      promise.all(function(){})
      
      promise._queues.length.should.be 2
    end
    
    it 'should allow empty promises'
      promise = new Promise();
      promise.get()
      promise.one()
      
      -{ promise.complete([]) }.should.not.throw_error
    end
    
  end
  
end