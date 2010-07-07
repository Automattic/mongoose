Model = require('./lib/model').Model
mongoose = require('mongoose').Mongoose
ObjectID = require('mongodb').ObjectID
    
mongoose.model('User', {
  
  properties: [
    'name',
    'first',
    'last',
    { 
      likes: [],
      dislikes: [],
      location: ['street','city','zip'],
      blogposts: [['key', '']]
    }
  ],
  
  cast: {
    last: String
  },
  
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
      },
      
      thezip: function(v){
        this.zip = v;
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
    
    it 'should add event emitter to the static methods'
      test = 0
      User = db.model('User')
      User.addListener('test', function(){
        test = 1
      });
      User.emit('test');
      test.should.be 1
    end
    
    it 'should add the prototype methods'
      User = db.model('User')
      User.prototype.newMethod.should.not.be_undefined
      user = new User();
      -{ user.save(); }.should.not.throw_error
      user.newMethod.should.not.be_undefined
    end
    
    it 'should add a reference to the static to the prototype'
      User = db.model('User')
      user = new User();
      user.static.should.be User
    end
    
    it 'should fire two notifications, one at instance level, one at model level'
      notifications = 0
    
      User = db.model('User')
      User.addListener('test', function(a, b){
        if (a == 'ok' && b instanceof User) notifications++;
      });
      
      user = new User();
      user.addListener('test', function(a, b){
        if (a == 'ok' && b == undefined) notifications++;
      })
      user.fire('test', 'ok');

      notifications.should.be 2
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
    
    it 'should handle model definition variants'
      mongoose.model('Variant',{
        properties: [
          '_sid', 
          {
            name: ['prefix', 'first', 'middle', 'last'],
            notes: []
          },
          'missing'
        ]
      });
      Variant = db.model('Variant');
      variant = new Variant();
      variant.__doc.missing.should.be null
    end
    
    it 'should generate an ObjectID at creation'
      User._connection.should.be db
      user = new User()
      user._id.toHexString().should.be_type 'string'
      user._id.toHexString().length.should.be 24   
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
    
    it 'should unlink the document from the prototype (nested)'
      User = db.model('User')
      
      john = new User();
      mark = new User();
      john.location.zip = 'random'
      mark.location.zip.should.not.be 'random'
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
      john._get('embedded').should.be_an Array
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
    
    it 'should handle nested fake setters'
      User = db.model('User');
      john = new User();
      john.location.thezip = 505
      john.location.zip.should.be 505
    end
    
    it 'should not set if value is undefined'
      User = db.model('User')
      john = new User();
      john.first = 'John'
      john.first.should.be 'John'
      
      john.first = undefined
      john.first.should.be 'John'
      
    end

  end
  
  describe 'Casting'
  
    it 'should cast values to the proper type'
      User = db.model('User')
      user = new User()
      user.last = 34324;
      user.__doc.last.should.be_an String
      user.__doc.last.should.be '34324'
    end
    
    it 'should handle nested cast definitions'
      mongoose.model('Casting',{
        properties: [
          'name','last','created_at', 'updated_at','pid',
          {likes: []},
          {dislikes: []},
          {blogposts: []},
          {location: ['street','city']}
        ],
        
        cast: {
          created_at: Date,
          updated_at: Date,
          'location.street': Number,
          pid: ObjectID
        }
        
      });
      var Casting = db.model('Casting'),
          user = new Casting();
      user.location.street = '3423 st.';
      user.location.street.should.be_an Number
      user.location.street.should.be 3423
      
      user.pid = '4c04292b5e41436224a9a641'
      user.pid.should.be_an ObjectID
      
      user.created_at = 'Thu, 01 Jan 1970 00:00:00 GMT-0400'
      user.created_at.should.be_an Date
      user.updated_at = 807937200000
      user.updated_at.should.be_an Date
    end
    
    it 'should cast arrays upon saving'
      mongoose.model('Casting2', {
        properties: [
          { objects: [] }
        ],
        cast: {
          'objects': ObjectID
        }
      })
      
      var Casting2 = db.model('Casting2'),
          blogpost = new Casting2();
      
      blogpost.objects.push('4c04292b5e41436224a9a641', new ObjectID('f47af44b185411db1c010000'))
      blogpost.save();
      blogpost.objects[0].should.be_an ObjectID
      blogpost.objects[1].should.be_an ObjectID
    end
    
    it 'should cast properties beginning with _ automatically to ObjectID, including _id'
      mongoose.model('Casting3', {
        properties: ['_owner', '_category', '_test']
      })
      
      var Casting3 = db.model('Casting3'),
          blogpost = new Casting3();
      blogpost._owner = '4c04292b5e41436224a9a641';
      blogpost._category = 'f47af44b185411db1c010000';
      blogpost._test = new ObjectID('4c04292b5e41436224a9a641');
      
      blogpost._owner.should.be_an ObjectID
      blogpost._category.should.be_an ObjectID
      blogpost._test.should.be_an ObjectID
    end
    
  end
  
  describe 'Enumerable Properties'
  
    it 'should enumerate model properties'
      User = db.model('User')
      user = new User()
      user.should.include 'name'
      user.should.include 'first'
      user.should.include 'last'
      user.should.include 'likes'
      user.should.include 'dislikes'
      user.should.include 'location'
      user.should.include 'blogposts'
      user.should.include '_id'
    end
    
    it 'should not enumerate on instance private properties'
      User = db.model('User')
      user = new User();
      props = {}; for(i in user) props[i] = true;
      // props.__doc.should.be_undefined
      props._schema.should.be_undefined
      props.isDirty.should.be_undefined
      props.model.should.be_undefined
    end
    
    it 'should not enumerate the prototype'
      User = db.model('User')
      user = new User();
      props = {}; for(i in user) props[i] = true;
      props.emit.should.be_undefined
      props.addListener.should.be_undefined
      props.removeListener.should.be_undefined
      props.removeAllListners.should.be_undefined
      props.listeners.should.be_undefined
      props.init.should.be_undefined
      props._hydrate.should.be_undefined
      props._error.should.be_undefined
      props._set.should.be_undefined
      props._get.should.be_undefined
      props._cast.should.be_undefined
      props.toObject.should.be_undefined
    end
    
    it 'should not enumerate on extended properties'
      User = db.model('User');
      user = new User();
      props = {}; for(i in user) props[i] = true;
      props['save'].should.be_undefined
      props['remove'].should.be_undefined 
    end

  end
  
  describe 'Data Population'
  
    it 'should populate data when object passed on initialization'
      User = db.model('User');
      user = new User({first: 'Nathan', last: 'White', invalid: 'field'});
      user.first.should.equal 'Nathan'
      user.__doc.first.should.equal 'Nathan'
      user.last.should.equal 'white'
      user.__doc.last.should.equal 'White'
      // user.invalid.should.equal 'field'
      // user.__doc.invalid.should.equal undefined 
    end
    
    it 'should populated nested properties'
      User = db.model('User')
      user = new User({location: {street: 'Mission'}})
      user.location.street.should.equal 'Mission St'
      user.__doc.location.street.should.equal 'Mission St'
    end
  
  end
  
end