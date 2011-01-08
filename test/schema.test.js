
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , SchemaTypes = mongoose.SchemaTypes;

/**
 * Test.
 */

module.exports = {

  'different schema types support': function(){
    var Ferret = new Schema({
        name      : String
      , owner     : ObjectId
      , fur       : String
      , color     : { type: String }
      , age       : Number
      , checkins  : [Checkin]
      , friends   : [ObjectId]
    });

    var Checkin = new Schema({
        date      : Date 
      , location  : {
            lat: Number
          , lng: Number
        }
    });

    Ferret.get('name').should.be.instanceof(SchemaType.String);
    Ferret.get('owner').should.be.instanceof(SchemaType.ObjectId);
    Ferret.get('fur').should.be.instanceof(SchemaType.String);
    Ferret.get('color').should.be.instanceof(SchemaType.String);
    Ferret.get('age').should.be.instanceof(SchemaType.Number);
    Ferret.get('checkins').should.be.instanceof(SchemaType.DocumentArray);
    Ferret.get('friends').should.be.instanceof(SchemaType.Array);

    Checkin.get('date').should.be.instanceof(SchemaType.Date);
    Checkin.get('location').should.be.instanceof(SchemaType.Object);
  },

  'dot notation support for accessing keys': function(){
    var Person = new Schema({
        name:       String
      , raccoons:   [Racoon]
      , location:    {
            city:   String
          , state:  String
        }
    });

    var Racoon = new Schema({
        name:       { type: String, enum: ['Edwald', 'Tobi'] }
      , age:        Number
    });

    Person.key('name').should.be.instanceof(SchemaTypes.String);
    Person.key('raccons').should.be.instanceof(SchemaTypes.DocumentArray);
    Person.key('location.city').should.be.instanceof(SchemaTypes.String);
    Person.key('location.state').should.be.instanceof(SchemaTypes.String);
  },

  'string type with built-in validators': function(){
    var Test = new Schema({
        simple: String
      , complex: { type: String, enum: ['a', 'b', 'c'],  }
    });

    Test.key('simple').required(true);
    Test.key('simple').validators.should.have.length(1);

    Test.key('complex').should.be.instanceof(SchemaType.String);
    Test.key('complex').enumValues.should.eql(['a', 'b', 'c']);
    Test.key('complex').validators.should.have.length(1);

    Test.key('complex').enum('d', 'e');

    Test.key('complex').enumValues.should.eql(['a', 'b', 'c', 'd', 'e']);
  },

  'test default definition': function(){
    var Test = new Schema({
        simple: { type: String, default: 'test' }
      , callback: { type: Number, default: function(){ } }
    });

    Test.key('simple').defaultValue.should.eql('test');
    Test.key('callback').defaultValue.should.be.a('function');
  }

};
