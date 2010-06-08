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
  
  it 'should throw when database is not present'
    -{ mongoose.connect('mongodb://localhost') }.should.throw_error /database name/
  end
  
end