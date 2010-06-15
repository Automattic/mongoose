Class = require('util').Class
object = require('./util').object

describe 'Util'
  describe 'Class'
    describe '.version'
      it 'should be a triple'
        Class.version.should.match(/^\d+\.\d+\.\d+$/)
      end
    end

    describe '()'
      it 'should create a class'
        User = Class()
        User.should.be_type 'function'
      end
    end
  
    describe '.extend()'
      it 'should create a class'
        User = Class.extend()
        User.should.be_type 'function'
      end
    end
  
    describe '.extend'
      it 'should mixin to the constructors singleton proto'
        Foo = { a: 'b' }
        Bar = { c: 'd' }
        Baz = Class({
          extend: [Foo, Bar]
        })
        Baz.should.have_property 'a', 'b'
        Baz.should.have_property 'c', 'd'
      end
    
      it 'should extend a single mixin'
        Foo = { a: 'b' }
        Bar = Class({
          extend: Foo
        })
        Bar.should.have_property 'a', 'b'
      end
      
      it 'should add to the singleton when inheriting'
        Foo = Class({
          extend: {
            path: '/'
          }
        });
        
        Bar = Foo.extend({
          extend: {
            test: '#'
          }
        })
        
        Foo.should.have_property 'path', '/'
        Bar.should.have_property 'path', '/'
        Bar.should.have_property 'test', '#'
      end
      
    end
  
    describe '.include'
      it 'should include an array of mixins'
        Foo = { a: 'b' }
        Bar = { c: 'd' }
        Baz = Class({
          include: [Foo, Bar],
          d: 'e'
        })
        (new Baz).should.have_property 'a', 'b'
        (new Baz).should.have_property 'c', 'd'
        (new Baz).should.have_property 'd', 'e'
      end
    
      it 'should include a single mixin'
        Foo = { a: 'b' }
        Bar = Class({
          include: Foo,
          c: 'd'
        })
        (new Bar).should.have_property 'a', 'b'
        (new Bar).should.have_property 'c', 'd'
      end
    end
  
    describe '.include()'
      it 'should merge additional methods'
        Foo = Class({
          bar: function(){}
        })
        Foo.include({
          baz: function(){}
        })
        (new Foo).should.respond_to 'bar'
        (new Foo).should.respond_to 'baz'
      end
    
      it 'should merge additional properties'
        Foo = Class({
          bar: 1
        })
        Foo.include({
          baz: 2
        })
        (new Foo).should.have_property 'bar'
        (new Foo).should.have_property 'baz'
      end
    
      it 'should support __super__()'
        Foo = Class({
          toString: function(){
            return 'Foo'
          }
        })
        Bar = Foo.extend()
        Bar.include({
          toString: function(){
            return this.__super__() + ' Bar'
          }
        })
        (new Foo).toString().should.eql 'Foo'
        (new Bar).toString().should.eql 'Foo Bar'
      end
    end
  
    describe '({ ... })'
      it 'should populate prototype properties'
        User = Class({ type: 'user' })
        (new User).type.should.eql 'user'
      end
    
      it 'should populate prototype methods'
        User = Class({ toString: function(){ return 'test' }})
        (new User).toString().should.eql 'test'
      end
    
      it 'should initialize with the "init" method'
        User = Class({
          init: function(name) {
            this.name = name
          }
        })
        (new User('tj')).name.should.eql 'tj'
      end
    
      it 'should call the "init" method only once per initialization'
        name = null;
        init = function(val){ name = val; }
        User = Class({ init: init });
        new User('tj')
        name.should.be 'tj'
      end
    
      it 'should inherit properties of the super class'
        User = Class({ type: 'user' })
        Admin = User.extend()
        (new Admin).type.should.eql 'user'
      end

      it 'should work when using the instanceof operator'
        User = Class({ type: 'user' })
        Admin = User.extend()
        (new User).should.be_an_instance_of Class
        (new User).should.be_an_instance_of User
        (new Admin).should.be_an_instance_of Class
        (new Admin).should.be_an_instance_of User
        (new Admin).should.be_an_instance_of Admin
      end

      it 'should access the superclass via __super__'
        User = Class({
          init: function(name) {
            this.name = name
          }
        })

        Admin = User.extend({
          init: function(name) {
            this.__super__(name)
          }  
        })

        (new Admin('tj')).name.should.eql 'tj'
      end

      it 'should allow a subclass to override methods'
        User = Class({
          init: function(name) {
            this.name = name
          }
        })

        Admin = User.extend({
          init: function(name) {
            this.name = '<' + name + '>'
          }  
        })

        (new Admin('tj')).name.should.eql '<tj>'
      end

      it 'should allow multiple inheritance'
        User = Class({
          init: function(name) {
            this.name = name
          },

          toString: function() {
            return this.name
          }
        })

        Manager = User.extend({
          init: function(name) {
            this.__super__(name)
            this.type = 'Manager'
          },

          toString: function() {
            return this.__super__() + ' is a ' + this.type
          }
        })

        Admin = Manager.extend({
          init: function(name) {
            this.__super__(name)
            this.type = 'Admin'
          }
        })

        (new User('tj')).toString().should.eql 'tj'
        (new Manager('tj')).toString().should.eql 'tj is a Manager'
        (new Admin('tj')).toString().should.eql 'tj is a Admin'
      end
    end
  end
  
  describe 'object'
    describe 'mixin'    
      // it 'should merge objects when a getter returns an object'
      //   obj = {}; contact = {phone: '555-555-5555'};
      //   obj.__defineGetter__('contact',function(){ return contact; });
      //   object.mixin(true,obj, {contact:{email: 'nw@nwhite.net'}} );
      // end
    end
  end
end