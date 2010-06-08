mongoose = require('mongoose').Mongoose
Connection = require('./lib/connection').Connection

describe 'Mongoose'
  
  it 'should save the model definition'
    mongoose.model('Test', {
      collection: 'tests',
      properties: ['one', 'property']
    })
    mongoose.model('Test').collection.should.be 'tests'
    mongoose.model('Test').properties[0].should.be 'one'
  end

  it 'should throw when protocol is not present'
    -{ mongoose.connect('localhost/test') }.should.throw_error /mongodb:/
  end
  
  it 'should throw when database is not present'
    -{ mongoose.connect('mongodb://localhost') }.should.throw_error /database name/
  end
  
  it 'should singleton the databases'
    db1 = mongoose.connect('mongodb://localhost/test')
    db2 = mongoose.connect('mongodb://localhost/TEST')
    db3 = mongoose.connect('mongodb://LOCALHOST/test/')
    
    db1.should.equal db2
    db2.should.equal db3
  end
  
end