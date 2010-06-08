Model = require('./lib/model').Model
mongoose = require('mongoose').Mongoose
    
mongoose.model('User', {
  
  properties: ['name', ['likes'], ['dislikes'], [{blogposts: ['name', 'body']}], 'last'],
  
  static: {
    findByName: function(){},
    
    findByLast: function(){}
  }
  
})

db = mongoose.connect('mongodb://localhost/fake') // fake!

describe 'Model'
  
  describe 'Class generation'
    it 'should generate a class'
      User = db.model('User')
      user = new User()
      user.should.be_an_instance_of Model
    end
    
    it 'should add the static methods'
      User = db.model('User')
      User.should.include 'findByName'
      User.should.include 'findByLast'
    end
    
    it 'should add the connection the prototype'
      User._connection.should.be db
      user = new User()
      user._connection.should.be db
    end
    
    it 'should generate the schema'
      user = new User();
      user.__doc.should.include 'name'
      user.__doc.name.should.be_null
      user.__doc.should.include 'likes'
      user.__doc.likes.should.be_an Array
      user.__doc.should.include 'dislikes'
      user.__doc.dislikes.should.be_an Array
      user.__doc.should.include 'blogposts'
      user.__doc.blogposts.should.be_an Array
      user.__doc.should.include 'last'
      user.__doc.last.should.be_null
    end
  end
  
  describe 'Getters/setters'
    
  end
  
end