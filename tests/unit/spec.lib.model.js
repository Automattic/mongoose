Model = require('./lib/model').Model
mongoose = require('mongoose').Mongoose
    
mongoose.model('User', {
  
  properties: ['name', ['likes'], ['dislikes'], {location: ['street', 'city']}, [{blogposts: ['name', 'body']}], 'last'],
  
  methods: {
    save: function(fn){
      this.__super__(fn);
    },
    
    newMethod: function(){}
  },
  
  setters: {
    
    name: function(){
      return 'John locke';
    }
    
  },
  
  getters: {
    
    last: function(v){
      return v.toLowerCase();
    },
    
    full: function(){
      return 'test'
    },
    
    test: function(){
      return arguments.length;
    }
    
  },
  
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
    
    it 'should add the prototype methods'
      User = db.model('User')
      User.prototype.newMethod.should.not.be_undefined
      user = new User();
      -{ user.save(); }.should.not.throw_error
      user.should.include 'newMethod'
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
      user.__doc.should.include 'location'
      user.__doc.location.should.be_type 'object'
      user.__doc.location.should.include 'city'
      user.__doc.location.should.include 'street'
    end
  end
  
  describe 'Hydration'
  
  end
  
  describe 'Getters/setters'
  
    it 'should detect return value to set the property and avoid recursion'
      User = db.model('User')
      john = new User()
      john.name = 'Peter'
      john.name.should.be 'John locke'
    end
    
    it 'should pass the value as argument if the getter matches a defined property'
      User = db.model('User')
      john = new User()
      john.last = 'John'
      john.__doc.last.should.be 'John'
      john.last.should.be 'john'
    end
    
    it 'should provide a getter for which no property is defined'
      User = db.model('User')
      john = new User()
      john.full.should.be 'test'
    end
    
    it 'should not pass any arguments to a getter for which no property is defined'
      User = db.model('User')
      john.test.should.be 0
    end

  end
  
end