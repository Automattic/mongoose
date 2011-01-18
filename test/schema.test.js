
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , should = require('should')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ObjectId = Schema.ObjectId
  , ValidatorError = SchemaType.ValidatorError
  , CastError = SchemaType.CastError
  , SchemaTypes = Schema.Types
  , DocumentObjectId = mongoose.Types.ObjectId
  , MongooseNumber = mongoose.Types.Number;

/**
 * Test.
 */

module.exports = {

  'test different schema types support': function(){
    var Checkin = new Schema({
        date      : Date 
      , location  : {
            lat: Number
          , lng: Number
        }
    });

    var Ferret = new Schema({
        name      : String
      , owner     : ObjectId
      , fur       : String
      , color     : { type: String }
      , age       : Number
      , checkins  : [Checkin]
      , friends   : [ObjectId]
      , likes     : Array
      , alive     : Boolean
    });

    Ferret.path('name').should.be.an.instanceof(SchemaTypes.String);
    Ferret.path('owner').should.be.an.instanceof(SchemaTypes.ObjectId);
    Ferret.path('fur').should.be.an.instanceof(SchemaTypes.String);
    Ferret.path('color').should.be.an.instanceof(SchemaTypes.String);
    Ferret.path('age').should.be.an.instanceof(SchemaTypes.Number);
    Ferret.path('checkins').should.be.an.instanceof(SchemaTypes.DocumentArray);
    Ferret.path('friends').should.be.an.instanceof(SchemaTypes.Array);
    Ferret.path('likes').should.be.an.instanceof(SchemaTypes.Array);
    Ferret.path('alive').should.be.an.instanceof(SchemaTypes.Boolean);

    should.strictEqual(Ferret.path('unexistent'), undefined);

    Checkin.path('date').should.be.an.instanceof(SchemaTypes.Date);
  },

  'dot notation support for accessing paths': function(){
    var Racoon = new Schema({
        name  : { type: String, enum: ['Edwald', 'Tobi'] }
      , age   : Number
    });

    var Person = new Schema({
        name      :       String
      , raccoons  :   [Racoon]
      , location  :    {
            city  :   String
          , state :  String
        }
    });

    Person.path('name').should.be.an.instanceof(SchemaTypes.String);
    Person.path('raccoons').should.be.an.instanceof(SchemaTypes.DocumentArray);
    Person.path('location.city').should.be.an.instanceof(SchemaTypes.String);
    Person.path('location.state').should.be.an.instanceof(SchemaTypes.String);

    should.strictEqual(Person.path('location.unexistent'), undefined);
  },

  'test default definition': function(){
    var Test = new Schema({
        simple    : { type: String, default: 'a' }
      , callback  : { type: Number, default: function(){
          this.a.should.eql('b');
          return 'b';
        }}
    });

    Test.path('simple').defaultValue.should.eql('a');
    Test.path('callback').defaultValue.should.be.a('function');

    Test.path('simple').getDefault().should.eql('a');
    Test.path('callback').getDefault({ a: 'b' }).should.eql('b');
  },

  'test string required validation': function(){
    var Test = new Schema({
        simple: String
    });

    Test.path('simple').required(true);
    Test.path('simple').validators.should.have.length(1);
    
    Test.path('simple').doValidate(null, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Test.path('simple').doValidate(undefined, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
    
    Test.path('simple').doValidate('', function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Test.path('simple').doValidate('woot', function(err){
      should.strictEqual(err, null);
    });
  },

  'test string enum validation': function(){
    var Test = new Schema({
        complex: { type: String, enum: ['a', 'b', 'c'] }
    });

    Test.path('complex').should.be.an.instanceof(SchemaTypes.String);
    Test.path('complex').enumValues.should.eql(['a', 'b', 'c']);
    Test.path('complex').validators.should.have.length(1);

    Test.path('complex').enum('d', 'e');

    Test.path('complex').enumValues.should.eql(['a', 'b', 'c', 'd', 'e']);

    Test.path('complex').doValidate('x', function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Test.path('complex').doValidate('da', function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test string regular expression validation': function(){
    var Test = new Schema({
        simple: { type: String, match: /[a-z]/ }
    });

    Test.path('simple').validators.should.have.length(1);

    Test.path('simple').doValidate('az', function(err){
      should.strictEqual(err, null);
    });

    Test.path('simple').match(/[0-9]/);
    Test.path('simple').validators.should.have.length(2);

    Test.path('simple').doValidate('12', function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Test.path('simple').doValidate('a12', function(err){
      should.strictEqual(err, null);
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
    Tobi.path('nickname').cast(0).should.be.a('string');
    Tobi.path('nickname').cast(0).should.eql('0');

    // test any object that implements toString
    Tobi.path('nickname').cast(new Test()).should.be.a('string');
    Tobi.path('nickname').cast(new Test()).should.eql('woot');
  },

  'test number minimums and maximums validation': function(){
    var Tobi = new Schema({
        friends: { type: Number, max: 15, min: 5 }
    });

    Tobi.path('friends').validators.should.have.length(2);

    Tobi.path('friends').doValidate(10, function(err){
      should.strictEqual(err, null);
    });

    Tobi.path('friends').doValidate(100, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Tobi.path('friends').doValidate(1, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test number required validation': function(){
    var Edwald = new Schema({
        friends: { type: Number, required: true }
    });

    Edwald.path('friends').doValidate(null, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Edwald.path('friends').doValidate(undefined, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Edwald.path('friends').doValidate(0, function(err){
      should.strictEqual(err, null);
    });
  },

  'test number casting': function(){
    var Tobi = new Schema({
        age: Number
    });

    // test String -> Number cast
    Tobi.path('age').cast('0').should.be.an.instanceof(MongooseNumber);
    (+Tobi.path('age').cast('0')).should.eql(0);

    Tobi.path('age').cast(0).should.be.an.instanceof(MongooseNumber);
    (+Tobi.path('age').cast(0)).should.eql(0);
  },

  'test date required validation': function(){
    var Loki = new Schema({
        birth_date: { type: Date, required: true }
    });

    Loki.path('birth_date').doValidate(null, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.path('birth_date').doValidate(undefined, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.path('birth_date').doValidate(new Date(), function (err) {
      should.strictEqual(err, null);
    });
  },

  'test date casting': function(){
    var Loki = new Schema({
        birth_date: { type: Date }
    });

    Loki.path('birth_date').cast(1294525628301).should.be.an.instanceof(Date);
    Loki.path('birth_date').cast('8/24/2000').should.be.an.instanceof(Date);
    Loki.path('birth_date').cast(new Date).should.be.an.instanceof(Date);
  },

  'test object id required validator': function(){
    var Loki = new Schema({
        owner: { type: ObjectId, required: true }
    });

    Loki.path('owner').doValidate(new DocumentObjectId(), function(err){
      should.strictEqual(err, null);
    });

    Loki.path('owner').doValidate(null, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test object id casting': function(){
    var Loki = new Schema({
        owner: { type: ObjectId }
    });

    Loki.path('owner').cast('4c54f3453e688c000000001a')
                     .should.be.an.instanceof(DocumentObjectId);

    Loki.path('owner').cast(new DocumentObjectId())
                     .should.be.an.instanceof(DocumentObjectId);
  },

  'test array required validation': function(){
    var Loki = new Schema({
        likes: { type: Array, required: true }
    });

    Loki.path('likes').doValidate(null, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.path('likes').doValidate(undefined, function (err) {
      err.should.be.an.instanceof(ValidatorError);
    });

    Loki.path('likes').doValidate([], function (err) {
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

    var oids = Loki.path('oids').cast(['4c54f3453e688c000000001a', new DocumentObjectId]);
    
    oids[0].should.be.an.instanceof(DocumentObjectId);
    oids[1].should.be.an.instanceof(DocumentObjectId);

    var dates = Loki.path('dates').cast(['8/24/2010', 1294541504958]);

    dates[0].should.be.an.instanceof(Date);
    dates[1].should.be.an.instanceof(Date);

    var numbers = Loki.path('numbers').cast([152, '31']);

    numbers[0].should.be.an.instanceof(MongooseNumber);
    numbers[1].should.be.an.instanceof(MongooseNumber);
    
    var strings = Loki.path('strings').cast(['test', 123]);

    strings[0].should.be.a('string');
    strings[0].should.eql('test');

    strings[1].should.be.a('string');
    strings[1].should.eql('123');

    var nocasts = Loki.path('nocast').cast(['test', 123]);

    nocasts[0].should.be.a('string');
    nocasts[0].should.eql('test');

    nocasts[1].should.be.a('number');
    nocasts[1].should.eql(123);
  },

  'test boolean required validator': function(){
    var Animal = new Schema({
        isFerret: { type: Boolean, required: true }
    });

    Animal.path('isFerret').doValidate(null, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Animal.path('isFerret').doValidate(undefined, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
    
    Animal.path('isFerret').doValidate(true, function(err){
      should.strictEqual(err, null);
    });

    Animal.path('isFerret').doValidate(false, function(err){
      should.strictEqual(err, null);
    });
  },

  'test boolean casting': function(){
    var Animal = new Schema({
        isFerret: { type: Boolean, required: true }
    });

    Animal.path('isFerret').cast(null).should.be.false;
    Animal.path('isFerret').cast(undefined).should.be.false;
    Animal.path('isFerret').cast(false).should.be.false;
    Animal.path('isFerret').cast(0).should.be.false;
    Animal.path('isFerret').cast('0').should.be.false;
    Animal.path('isFerret').cast({}).should.be.true;
    Animal.path('isFerret').cast(true).should.be.true;
    Animal.path('isFerret').cast(1).should.be.true;
    Animal.path('isFerret').cast('1').should.be.true;
  },

  'test async validators': function(){

  },

  'test declaring a new method': function(){

  },

  'test declaring a new static': function(){

  },

  'test defining a setter': function(){

  },

  'test defining a getter': function(){

  },

  'test defining pre hooks': function(){

  },

  'test defining post hooks': function(){

  }

};
