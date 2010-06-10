Model = require('./lib/model').Model
mongoose = require('mongoose').Mongoose
    
mongoose.model('User', {
  
  properties: [
    'name',
    'last',
    { 
      likes: [],
      dislikes: [],
      location: ['street','city'],
      blogposts: []
    }
  ],
  
  methods: {
    save: function(fn){
      this.__super__(fn);
    },
    
    newMethod: function(){}
  },
  
  setters: {
    
    name: function(){
      return 'John locke';
    },
    
    location: {
      street: function(v){
        return v + ' St';
      }
    }
    
  },
  
  getters: {
    
    last: function(v){
      return v ? v.toLowerCase() : '';
    },
    
    full: function(){
      return 'test'
    },
    
    test: function(){
      return arguments.length;
    },
    
    location: {
      city: function(v){
        return 'in: ' + v;
      },
      
      custom: function(){
        return 'custom';
      }
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
      user = new User();
      user.should.be_an_instance_of Model
    end
    
    it 'should add the static methods'
      User = db.model('User')
      User.find.should.not.be_undefined
      User.findByName.should.not.be_undefined
      User.findByLast.should.not.be_undefined
    end
    
    it 'should add the prototype methods'
      User = db.model('User')
      User.prototype.newMethod.should.not.be_undefined
      user = new User();
      -{ user.save(); }.should.not.throw_error
      user.newMethod.should.not.be_undefined
    end
    
    it 'should add the connection the prototype'
      User._connection.should.be db
      user = new User()
      user._connection.should.be db
    end
    
    it 'should generate the schema'
      User = db.model('User');
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
    
    it 'should generate the schema with multiple object syntax'
      mongoose.model('Multi',{
        properties: [
          'name','last',
          {likes: []},
          {dislikes: []},
          {blogposts: []},
          {location: ['street','city']}
        ]
      });
      Multi = db.model('Multi');
      user = new Multi();
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
    
    it 'should hydrate the objects'
      User = db.model('User')
      john = new User({
        some: 'stuff',
        another: {
          test: 'ing',
          stuff: 'app'
        },
        likes: ['rock', 'pop'],
        embedded: [{
          test: 'test'
        }]
      },true);
      
      john.__doc.some.should.be 'stuff'
      john.__doc.likes.length.should.be 2
      john.__doc.likes[0].should.be 'rock'
      john.__doc.likes[1].should.be 'pop'
      john.__doc.another.should.be_type 'object'
      john.__doc.another.should.have_property 'test', 'ing'
      john.__doc.another.should.have_property 'stuff', 'app'
      john.__doc.embedded.length.should.be 1
      john.__doc.embedded[0].should.have_property 'test', 'test'
    end
    
    it 'should unlink the document from the prototype'
      User = db.model('User')
      
      john = new User();
      mark = new User();
      john.last = 'last'
      mark.last.should.not.be 'last'
    end
    
  end
  
  describe 'Getters/setters'
  
    it 'should get from a string describing a path'
      User = db.model('User')
      john = new User({
        some: 'stuff',
        another: {
          test: 'ing',
          stuff: 'app'
        },
        arrrr: [],
        embedded: [{
          test: 'test'
        }]
      },true);

      john._get('some').should.be 'stuff'
      john._get('another').should.be_type 'object'
      john._get('another.test').should.be 'ing'
      john._get('another.stuff').should.be 'app'
      john._get('arrrr').should.be_an Array
      -{ john._get('embedded.test') }.should.throw_error /undefined/
    end
    
    it 'should set from a string describing a path'
      User = db.model('User')
      john = new User({
        some: 'stuff',
        another: {
          test: 'ing',
          stuff: 'app'
        }
      },true);

      john._set('some', 'STUFF')
      john._set('another.test', 'ING')
      john._set('another.stuff', 'APP')
      
      john._get('some').should.be 'STUFF'
      john._get('another').should.be_type 'object'
      john._get('another.test').should.be 'ING'
      john._get('another.stuff').should.be 'APP'
    end
  
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
      john.location.custom.should.be 'custom'
    end
    
    it 'should not pass any arguments to a getter for which no property is defined'
      User = db.model('User')
      john.test.should.be 0
    end
    
    it 'should handle nested getters'
      User = db.model('User')
      john = new User();
      john.location.city = 'Buenos Aires'
      john.location.city.should.be 'in: Buenos Aires'
    end
    
    it 'should handle nested setters'
      User = db.model('User')
      john = new User();
      john.location.street = 'Rockefeller'
      john.location.street.should.be 'Rockefeller St'
    end

  end 
end