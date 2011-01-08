
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , ValidatorError = Schema.ValidatorError
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

    Ferret.get('name').should.be.an.instanceof(SchemaType.String);
    Ferret.get('owner').should.be.an.instanceof(SchemaType.ObjectId);
    Ferret.get('fur').should.be.an.instanceof(SchemaType.String);
    Ferret.get('color').should.be.an.instanceof(SchemaType.String);
    Ferret.get('age').should.be.an.instanceof(SchemaType.Number);
    Ferret.get('checkins').should.be.an.instanceof(SchemaType.DocumentArray);
    Ferret.get('friends').should.be.an.instanceof(SchemaType.Array);

    Checkin.get('date').should.be.an.instanceof(SchemaType.Date);
    Checkin.get('location').should.be.an.instanceof(SchemaType.Object);
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

    Person.key('name').should.be.an.instanceof(SchemaTypes.String);
    Person.key('raccons').should.be.an.instanceof(SchemaTypes.DocumentArray);
    Person.key('location.city').should.be.an.instanceof(SchemaTypes.String);
    Person.key('location.state').should.be.an.instanceof(SchemaTypes.String);
  },

  'test default definition': function(){
    var Test = new Schema({
        simple    : { type: String, default: 'a' }
      , callback  : { type: Number, default: function(){
          return 'b';
        }}
      , async     : { type: String, default: function(fn){
          process.nextTick(function(){
            fn(null, 'c');
          });
        }}
    });

    Test.key('simple').defaultValue.should.eql('a');
    Test.key('callback').defaultValue.should.be.a('function');
    Test.key('async').defaultValue.should.be.a('function');

    Test.key('simple').getDefault(function(value){
      value.should.eql('a');
    });

    Test.key('callback').getDefault(function(value){
      value.should.eql('b');
    });

    Test.key('simple').getDefault(function(value){
      value.should.eql('c');
    });
  },

  'test string required validation': function(){
    var Test = new Schema({
        simple: String
    });

    Test.key('simple').required(true);
    Test.key('simple').validators.should.have.length(1);
    
    Test.key('simple').doValidate(null, function(err){
      
    });
    Test.key('simple').doValidate(undefined, function(err){
      
    });
    Test.key('simple').doValidate('', function(err){
      
    });
  },

  'test string enum validation': function(){
    var Test = new Schema({
        complex: { type: String, enum: ['a', 'b', 'c'] }
    });

    Test.key('complex').should.be.an.instanceof(SchemaType.String);
    Test.key('complex').enumValues.should.eql(['a', 'b', 'c']);
    Test.key('complex').validators.should.have.length(1);

    Test.key('complex').enum('d', 'e');

    Test.key('complex').enumValues.should.eql(['a', 'b', 'c', 'd', 'e']);

    Test.key('complex').doValidate('x', function(){
      arguments.should.have.length(1);
    });

    Test.key('complex').doValidate('da', function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test string regular expression validation': function(){
    var Test = new Schema({
        simple: { type: String, match: /[a-z]/ }
    });

    Test.key('simple').validators.length(1);
    Test.key('simple').match(/[0-9]/);
    Test.key('simple').validators.length(2);

    Test.key('simple').doValidate('az', function(){
      arguments.should.have.length(0);
    });

    Test.key('simple').doValidate('12', function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test number minimums and maximums validation': function(){
    var Tobi = new Schema({
        friends: { type: Number, max: 15, min: 5 }
    });

    Tobi.key('friends').validators.length(2);

    Tobi.key('friends').doValidate(10, function(){
      arguments.should.have.length(0);
    });

    Tobi.key('friends').doValidate(100, function(){
      arguments.should.have.length(1);
    });

    Tobi.key('friends').doValidate(1, function(){
      arguments.should.have.length(1);
    });
  }

};
