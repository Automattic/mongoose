
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , ValidatorError = Schema.ValidatorError
  , CastError = Schema.CastError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.ObjectId
  , SchemaTypes = mongoose.SchemaTypes
  , MongooseNumber = mongoose.Types.Number;

/**
 * Test.
 */

module.exports = {

  'test different schema types support': function(){
    var Ferret = new Schema({
        name      : String
      , owner     : ObjectId
      , fur       : String
      , color     : { type: String }
      , age       : Number
      , checkins  : [Checkin]
      , friends   : [ObjectId]
      , likes     : Array
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
    Ferret.get('likes').should.be.an.instanceof(SchemaType.Array);

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

  'test string casting': function(){
    var Tobi = new Schema({
        nickname: String
    });

    function Test(){};
    Test.prototype.toString = function(){
      return 'woot';
    };

    // test Number -> String cast
    Tobi.key('nickname').cast(0).should.be.a('string');
    Tobi.key('nickname').cast(0).should.eql('0');

    // test any object that implements toString
    Tobi.key('nickname').cast(new Test()).should.be.a('string');
    Tobi.key('nickname').cast(new Test()).should.eql('woot');
    
    // test raising an error
    try {
      var obj = Tobi.key('nickname').cast(null);
      obj.should.not.be.a('string'); // shouldn't get executed
    } catch(e){
      e.should.be.an.instanceof(CastError);
    }

    try {
      var obj = Tobi.key('nickname').cast(undefined);
      obj.should.not.be.a('string'); // shouldn't get executed
    } catch(e){
      e.should.be.an.instanceof(CastError);
    }
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
  },

  'test number required validation': function(){
    var Edwald = new Schema({
        friends: { type: Number, required: true }
    });

    Edwald.key('friends').doValidate(null, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Edwald.key('friends').doValidate(undefined, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Edwald.key('friends').doValidate(0, function(){
      arguments.length.should.be(0);
    });
  },

  'test number casting': function(){
    var Tobi = new Schema({
        age: Number
    });

    // test String -> Number cast
    Tobi.key('nickname').cast('0').should.be.an.instanceof(MongooseNumber);
    (+Tobi.key('nickname').cast('0')).should.eql(0);

    Tobi.key('nickname').cast(0).should.be.an.instanceof(MongooseNumber);
    (+Tobi.key('nickname').cast(0)).should.eql(0);
  },

  'test date required validation': function(){
    var Loki = new Schema({
        birth_date: { type: Date, required: true }
    });

    Loki.key('birth_date').doValidate(null, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.key('birth_date').doValidate(undefined, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.key('birth_date').doValidate(new Date(), function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test date casting': function(){
    var Loki = new Schema({
        birth_date: { type: Date }
    });

    Loki.key('birth_date').cast(1294525628301).should.be.an.instanceof(Date);
    Loki.key('birth_date').cast('8/24/2000').should.be.an.instanceof(Date);

    try {
      var obj = Loki.key('birth_date').cast('tobi');
      obj.should.not.be.an.instanceof(Date); // shouldn't get executed
    } catch(e){
      e.should.be.an.instanceof(CastError);
    }

    try {
      var obj = Loki.key('birth_date').cast(undefined);
      obj.should.not.be.an.instanceof(Date); // shouldn't get executed
    } catch(e){
      e.should.be.an.instanceof(CastError);
    }

    try {
      var obj = Loki.key('birth_date').cast(null);
      obj.should.not.be.an.instanceof(Date); // shouldn't get executed
    } catch(e){
      e.should.be.an.instanceof(CastError);
    }
  },

  'test object id required validator': function(){
    var Loki = new Schema({
        owner: { type: ObjectId }
    });

    Loki.key('owner').doValidate(new DocumentObjectId(), function(){
      arguments.should.have.length(0);
    });

    Loki.key('owner').doValidate(null, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test object id casting': function(){
    var Loki = new Schema({
        owner: { type: ObjectId }
    });

    Loki.key('owner').cast('4c54f3453e688c000000001a')
                     .should.be.an.instanceof(DocumentObjectId);

    Loki.key('owner').cast(new DocumentObjectId())
                     .should.be.an.instanceof(DocumentObjectId);

    try {
      var obj = Loki.key('owner').cast(undefined);
      obj.should.not.be.an.instanceof(DocumentObjectId); // shouldn't get executed
    } catch(e){
      e.should.be.an.instanceof(CastError);
    }

    try {
      var obj = Loki.key('owner').cast(null);
      obj.should.not.be.an.instanceof(DocumentObjectId); // shouldn't get executed
    } catch(e){
      e.should.be.an.instanceof(CastError);
    }
  },

  'test array required validation': function(){
    var Loki = new Schema({
        likes: { type: Array, required: true }
    });

    Loki.key('likes').doValidate(null, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.key('likes').doValidate(undefined, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.key('likes').doValidate([], function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test array casting': function(){
    var Loki = new Schema({
        oids        : [ObjectId]
      , dates       : [Date]
      , numbers     : [Number]
      , strings     : [String]
      , nocast      : []
    });

    var oids = Loki.key('oids').cast(['4c54f3453e688c000000001a'
                                      , new DocumentObjectId]);
    
    oids[0].should.be.an.instanceof(DocumentObjectId);
    oids[1].should.be.an.instanceof(DocumentObjectId);

    var dates = Loki.key('dates').cast(['8/24/2010', 1294541504958]);

    dates[0].should.be.an.instanceof(Date);
    dates[1].should.be.an.instanceof(Date);

    var numbers = Loki.key('numbers').cast([152, '31']);

    numbers[0].should.be.an.instanceof(MongooseNumber);
    numbers[1].should.be.an.instanceof(MongooseNumber);
    
    var strings = Loki.key('strings').cast(['test', 123]);

    strings[0].should.be.a('string');
    strings[0].should.eql('test');

    strings[1].should.be.a('string');
    strings[1].should.eql('123');

    var nocasts = Loki.key('nocast').cast(['test', 123]);

    nocasts[0].should.be.a('string');
    nocasts[0].should.eql('test');

    strings[1].should.be.a('number');
    strings[1].should.eql(123);
  }

};
