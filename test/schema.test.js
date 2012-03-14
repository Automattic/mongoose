
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , should = require('should')
  , Schema = mongoose.Schema
  , Document = mongoose.Document
  , SchemaType = mongoose.SchemaType
  , VirtualType = mongoose.VirtualType
  , ObjectId = Schema.ObjectId
  , ValidatorError = SchemaType.ValidatorError
  , CastError = SchemaType.CastError
  , SchemaTypes = Schema.Types
  , DocumentObjectId = mongoose.Types.ObjectId
  , Mixed = SchemaTypes.Mixed
  , MongooseNumber = mongoose.Types.Number
  , MongooseArray = mongoose.Types.Array
  , vm = require('vm')

/**
 * Test Document constructor.
 */

function TestDocument () {
  Document.apply(this, arguments);
};

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Set a dummy schema to simulate compilation.
 */

TestDocument.prototype.schema = new Schema({
    test    : String
});

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
      , extra     : Mixed
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
    Ferret.path('extra').should.be.an.instanceof(SchemaTypes.Mixed);

    should.strictEqual(Ferret.path('unexistent'), undefined);

    Checkin.path('date').should.be.an.instanceof(SchemaTypes.Date);
  },

  'dot notation support for accessing paths': function(){
    var Racoon = new Schema({
        name  : { type: String, enum: ['Edwald', 'Tobi'] }
      , age   : Number
    });

    var Person = new Schema({
        name      : String
      , raccoons  : [Racoon]
      , location  : {
            city  : String
          , state : String
        }
    });

    Person.path('name').should.be.an.instanceof(SchemaTypes.String);
    Person.path('raccoons').should.be.an.instanceof(SchemaTypes.DocumentArray);
    Person.path('location.city').should.be.an.instanceof(SchemaTypes.String);
    Person.path('location.state').should.be.an.instanceof(SchemaTypes.String);

    should.strictEqual(Person.path('location.unexistent'), undefined);
  },

  'nested paths more than 2 levels deep': function () {
    var Nested = new Schema({
      first: {
        second: {
          third: String
        }
      }
    });
    Nested.path('first.second.third').should.be.an.instanceof(SchemaTypes.String);
  },

  'test default definition': function(){
    var Test = new Schema({
        simple    : { type: String, default: 'a' }
      , array     : { type: Array, default: [1,2,3,4,5] }
      , arrayX    : { type: Array, default: 9 }
      , arrayFn   : { type: Array, default: function () { return [8] } }
      , callback  : { type: Number, default: function(){
          this.a.should.eql('b');
          return '3';
        }}
    });

    Test.path('simple').defaultValue.should.eql('a');
    Test.path('callback').defaultValue.should.be.a('function');

    Test.path('simple').getDefault().should.eql('a');
    (+Test.path('callback').getDefault({ a: 'b' })).should.eql(3);
    Test.path('array').defaultValue.should.be.a('function');
    Test.path('array').getDefault(new TestDocument)[3].should.eql(4);
    Test.path('arrayX').getDefault(new TestDocument)[0].should.eql(9);
    Test.path('arrayFn').defaultValue.should.be.a('function');
    Test.path('arrayFn').getDefault(new TestDocument).should.be.an.instanceof(MongooseArray);
  },

  'test Mixed defaults can be empty arrays': function () {
    var Test = new Schema({
        mixed1    : { type: Mixed, default: [] }
      , mixed2    : { type: Mixed, default: Array }
    });

    Test.path('mixed1').getDefault().should.be.an.instanceof(Array);
    Test.path('mixed1').getDefault().length.should.be.eql(0);
    Test.path('mixed2').getDefault().should.be.an.instanceof(Array);
    Test.path('mixed2').getDefault().length.should.be.eql(0);
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
        complex: { type: String, enum: ['a', 'b', undefined, 'c', null] }
    });

    Test.path('complex').should.be.an.instanceof(SchemaTypes.String);
    Test.path('complex').enumValues.should.eql(['a', 'b', 'c', null]);
    Test.path('complex').validators.should.have.length(1);

    Test.path('complex').enum('d', 'e');

    Test.path('complex').enumValues.should.eql(['a', 'b', 'c', null, 'd', 'e']);

    Test.path('complex').doValidate('x', function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Test.path('complex').doValidate(undefined, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });

    Test.path('complex').doValidate(null, function(err){
      should.strictEqual(null, err);
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

    // null is allowed
    Tobi.path('friends').doValidate(null, function(err){
      should.strictEqual(err, null);
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

    Loki.path('owner').doValidate(undefined, function(err){
      err.should.be.an.instanceof(ValidatorError);
    });
  },

  'test object id casting': function(){
    var Loki = new Schema({
        owner: { type: ObjectId }
    });

    var doc = new TestDocument()
      , id = doc._id.toString();

    Loki.path('owner').cast('4c54f3453e688c000000001a')
                     .should.be.an.instanceof(DocumentObjectId);

    Loki.path('owner').cast(new DocumentObjectId())
                     .should.be.an.instanceof(DocumentObjectId);

    Loki.path('owner').cast(doc)
                     .should.be.an.instanceof(DocumentObjectId);

    Loki.path('owner').cast(doc).toString().should.eql(id);
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
      , buffers     : [Buffer]
      , nocast      : []
      , mixed       : [Mixed]
    });

    var oids = Loki.path('oids').cast(['4c54f3453e688c000000001a', new DocumentObjectId]);

    oids[0].should.be.an.instanceof(DocumentObjectId);
    oids[1].should.be.an.instanceof(DocumentObjectId);

    var dates = Loki.path('dates').cast(['8/24/2010', 1294541504958]);

    dates[0].should.be.an.instanceof(Date);
    dates[1].should.be.an.instanceof(Date);

    var numbers = Loki.path('numbers').cast([152, '31']);

    numbers[0].should.be.a('number');
    numbers[1].should.be.a('number');

    var strings = Loki.path('strings').cast(['test', 123]);

    strings[0].should.be.a('string');
    strings[0].should.eql('test');

    strings[1].should.be.a('string');
    strings[1].should.eql('123');

    var buffers = Loki.path('buffers').cast(['\0\0\0', new Buffer("abc")]);

    buffers[0].should.be.an.instanceof(Buffer);
    buffers[1].should.be.an.instanceof(Buffer);

    var nocasts = Loki.path('nocast').cast(['test', 123]);

    nocasts[0].should.be.a('string');
    nocasts[0].should.eql('test');

    nocasts[1].should.be.a('number');
    nocasts[1].should.eql(123);

    var mixed = Loki.path('mixed').cast(['test', 123, '123', {}, new Date, new DocumentObjectId]);

    mixed[0].should.be.a('string');
    mixed[1].should.be.a('number');
    mixed[2].should.be.a('string');
    mixed[3].should.be.a('object');
    mixed[4].should.be.an.instanceof(Date);
    mixed[5].should.be.an.instanceof(DocumentObjectId);
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

    should.strictEqual(Animal.path('isFerret').cast(null), null);
    Animal.path('isFerret').cast(undefined).should.be.false;
    Animal.path('isFerret').cast(false).should.be.false;
    Animal.path('isFerret').cast(0).should.be.false;
    Animal.path('isFerret').cast('0').should.be.false;
    Animal.path('isFerret').cast({}).should.be.true;
    Animal.path('isFerret').cast(true).should.be.true;
    Animal.path('isFerret').cast(1).should.be.true;
    Animal.path('isFerret').cast('1').should.be.true;
  },

  'test async multiple validators': function(beforeExit){
    var executed = 0;

    function validator (value, fn) {
      setTimeout(function(){
        executed++;
        fn(value === true);
      }, 50);
    };

    var Animal = new Schema({
      ferret: {
        type: Boolean,
        validate: [
          {
            'validator': validator,
            'msg': 'validator1'
          },
          {
            'validator': validator,
            'msg': 'validator2'
          },
        ],
      }
    });

    Animal.path('ferret').doValidate(true, function(err){
      should.strictEqual(err, null);
    });

    beforeExit(function(){
      executed.should.eql(2);
    });
  },

  'test async validators': function(beforeExit){
    var executed = 0;

    function validator (value, fn) {
      setTimeout(function(){
        executed++;
        fn(value === true);
      }, 50);
    };

    var Animal = new Schema({
        ferret: { type: Boolean, validate: validator }
    });

    Animal.path('ferret').doValidate(true, function(err){
      should.strictEqual(err, null);
    });

    Animal.path('ferret').doValidate(false, function(err){
      err.should.be.an.instanceof(Error);
    });

    beforeExit(function(){
      executed.should.eql(2);
    });
  },

  'test async validators scope': function(beforeExit){
    var executed = false;
    
    function validator (value, fn) {
      this.a.should.eql('b');

      setTimeout(function(){
        executed = true;
        fn(true);
      }, 50);
    };

    var Animal = new Schema({
        ferret: { type: Boolean, validate: validator }
    });

    Animal.path('ferret').doValidate(true, function(err){
      should.strictEqual(err, null);
    }, { a: 'b' });

    beforeExit(function(){
      executed.should.be.true;
    });
  },

  'test declaring new methods': function(){
    var a = new Schema();
    a.method('test', function(){});
    a.method({
        a: function(){}
      , b: function(){}
    });

    Object.keys(a.methods).should.have.length(3);
  },

  'test declaring new statics': function(){
    var a = new Schema();
    a.static('test', function(){});
    a.static({
        a: function(){}
      , b: function(){}
      , c: function(){}
    });

    Object.keys(a.statics).should.have.length(4);
  },

  'test setter(s)': function(){
    function lowercase (v) {
      return v.toLowerCase();
    };

    var Tobi = new Schema({
        name: { type: String, set: lowercase }
    });

    Tobi.path('name').applySetters('WOOT').should.eql('woot');
    Tobi.path('name').setters.should.have.length(1);

    Tobi.path('name').set(function(v){
      return v + 'WOOT';
    });

    Tobi.path('name').applySetters('WOOT').should.eql('wootwoot');
    Tobi.path('name').setters.should.have.length(2);
  },

  'test setters scope': function(){
    function lowercase (v, self) {
      this.a.should.eql('b');
      self.path.should.eql('name');
      return v.toLowerCase();
    };

    var Tobi = new Schema({
        name: { type: String, set: lowercase }
    });

    Tobi.path('name').applySetters('WHAT', { a: 'b' }).should.eql('what');
  },

  'test string built-in setter `lowercase`': function () {
    var Tobi = new Schema({
        name: { type: String, lowercase: true }
    });

    Tobi.path('name').applySetters('WHAT').should.eql('what');
  },

  'test string built-in setter `uppercase`': function () {
    var Tobi = new Schema({
        name: { type: String, uppercase: true }
    });

    Tobi.path('name').applySetters('what').should.eql('WHAT');
  },

  'test string built-in setter `trim`': function () {
    var Tobi = new Schema({
        name: { type: String, uppercase: true, trim: true }
    });

    Tobi.path('name').applySetters('    what      ').should.eql('WHAT');
  },

  'test getter(s)': function(){
    function woot (v) {
      return v + ' woot';
    };

    var Tobi = new Schema({
        name: { type: String, get: woot }
    });

    Tobi.path('name').getters.should.have.length(1);
    Tobi.path('name').applyGetters('test').should.eql('test woot');
  },

  'test getters scope': function(){
    function woot (v, self) {
      this.a.should.eql('b');
      self.path.should.eql('name');
      return v.toLowerCase();
    };

    var Tobi = new Schema({
        name: { type: String, get: woot }
    });

    Tobi.path('name').applyGetters('YEP', { a: 'b' }).should.eql('yep');
  },

  'test setters casting': function(){
    function last (v) {
      v.should.be.a('string');
      v.should.eql('0');
      return 'last';
    };

    function first (v) {
      return 0;
    };
    
    var Tobi = new Schema({
        name: { type: String, set: last }
    });

    Tobi.path('name').set(first);
    Tobi.path('name').applySetters('woot').should.eql('last');
  },

  'test getters casting': function(){
    function last (v) {
      v.should.be.a('string');
      v.should.eql('0');
      return 'last';
    };

    function first (v) {
      return 0;
    };
    
    var Tobi = new Schema({
        name: { type: String, get: last }
    });

    Tobi.path('name').get(first);
    Tobi.path('name').applyGetters('woot').should.eql('last');
  },

  'test hooks registration': function(){
    var Tobi = new Schema();

    Tobi.pre('save', function(){});
    Tobi.callQueue.should.have.length(1);

    Tobi.post('save', function(){});
    Tobi.callQueue.should.have.length(2);

    Tobi.pre('save', function(){});
    Tobi.callQueue.should.have.length(3);
  },

  'test applying setters when none have been defined': function(){
    var Tobi = new Schema({
        name: String
    });

    Tobi.path('name').applySetters('woot').should.eql('woot');
  },

  'test applying getters when none have been defined': function(){
    var Tobi = new Schema({
        name: String
    });

    Tobi.path('name').applyGetters('woot').should.eql('woot');
  },

  'test defining an index': function(){
    var Tobi = new Schema({
        name: { type: String, index: true }
    });

    Tobi.path('name')._index.should.be.true;
    Tobi.path('name').index({ unique: true });
    Tobi.path('name')._index.should.eql({ unique: true });
    Tobi.path('name').unique(false);
    Tobi.path('name')._index.should.eql({ unique: false});

    var T1 = new Schema({
        name: { type: String, sparse: true }
    });
    T1.path('name')._index.should.eql({ sparse: true });

    var T2 = new Schema({
        name: { type: String, unique: true }
    });
    T2.path('name')._index.should.eql({ unique: true });

    var T3 = new Schema({
        name: { type: String, sparse: true, unique: true }
    });
    T3.path('name')._index.should.eql({ sparse: true, unique: true });

    var T4 = new Schema({
        name: { type: String, unique: true, sparse: true }
    });
    var i = T4.path('name')._index;
    i.unique.should.be.true;
    i.sparse.should.be.true;

    var T5 = new Schema({
        name: { type: String, index: { sparse: true, unique: true } }
    });
    var i = T5.path('name')._index;
    i.unique.should.be.true;
    i.sparse.should.be.true;
  },

  'test defining compound indexes': function(){
    var Tobi = new Schema({
        name: { type: String, index: true }
      , last: { type: Number, sparse: true }
    });

    Tobi.index({ firstname: 1, last: 1 }, { unique: true });

    Tobi.indexes.should.eql([
        [{ name: 1 }, {}]
      , [{ last: 1 }, { sparse: true }]
      , [{ firstname: 1, last: 1}, {unique: true}]
    ]);
  },

  'test plugins': function (beforeExit) {
    var Tobi = new Schema()
      , called = false;

    Tobi.plugin(function(schema){
      schema.should.equal(Tobi);
      called = true;
    });

    beforeExit(function () {
      called.should.be.true;
    });
  },

  'test that default options are set': function () {
    var Tobi = new Schema();

    Tobi.options.should.be.a('object');
    Tobi.options.safe.should.be.true;
  },

  'test setting options': function () {
    var Tobi = new Schema({}, { collection: 'users' });

    Tobi.set('a', 'b');
    Tobi.set('safe', false);
    Tobi.options.collection.should.eql('users');

    Tobi.options.a.should.eql('b');
    Tobi.options.safe.should.be.false;
  },

  'test declaring virtual attributes': function () {
    var Contact = new Schema({
        firstName: String
      , lastName: String
    });
    Contact.virtual('fullName')
      .get( function () {
        return this.get('firstName') + ' ' + this.get('lastName');
      }).set(function (fullName) {
        var split = fullName.split(' ');
        this.set('firstName', split[0]);
        this.set('lastName', split[1]);
      });

    Contact.virtualpath('fullName').should.be.an.instanceof(VirtualType);
  },

  'test GH-298 - The default creation of a virtual `id` should be muted when someone defines their own `id` attribute': function () {
    new Schema({ id: String });
  },

  'allow disabling the auto .id virtual': function () {
    var schema = new Schema({ name: String }, { noVirtualId: true });
    should.strictEqual(undefined, schema.virtuals.id);
  },

  'selected option': function () {
    var s = new Schema({ thought: { type: String, select: false }});
    s.path('thought').selected.should.be.false;

    var a = new Schema({ thought: { type: String, select: true }});
    a.path('thought').selected.should.be.true;
  },

  'schema creation works with objects from other contexts': function () {
    var str = 'code = {' +
      '  name: String' +
      ', arr1: Array ' +
      ', arr2: { type: [] }' +
      ', date: Date  ' +
      ', num: { type: Number }' +
      ', bool: Boolean' +
      ', nest: { sub: { type: {}, required: true }}' +
      '}';

    var script = vm.createScript(str, 'testSchema.vm');
    var sandbox = { code: null };
    script.runInNewContext(sandbox);

    var Ferret = new Schema(sandbox.code);
    Ferret.path('nest.sub').should.be.an.instanceof(SchemaTypes.Mixed);
    Ferret.path('name').should.be.an.instanceof(SchemaTypes.String);
    Ferret.path('arr1').should.be.an.instanceof(SchemaTypes.Array);
    Ferret.path('arr2').should.be.an.instanceof(SchemaTypes.Array);
    Ferret.path('date').should.be.an.instanceof(SchemaTypes.Date);
    Ferret.path('num').should.be.an.instanceof(SchemaTypes.Number);
    Ferret.path('bool').should.be.an.instanceof(SchemaTypes.Boolean);
  },

  'schema string casts undefined to "undefined"': function () {
    var db= require('./common')();
    var schema = new Schema({ arr: [String] });
    var M = db.model('castingStringArrayWithUndefined', schema);
    M.find({ arr: { $in: [undefined] }}, function (err) {
      db.close();
      should.equal(err && err.message, 'Cast to string failed for value "undefined"');
    })
  },

  'array of object literal missing a `type` is interpreted as Mixed': function () {
    var s = new Schema({
        arr: [
          { something: { type: String } }
        ]
    });
  },

  'helpful schema debugging msg': function () {
    var err;
    try {
      new Schema({ name: { first: null } })
    } catch (e) {
      err = e;
    }
    err.message.should.equal('Invalid value for schema path `name.first`')
    try {
      new Schema({ age: undefined })
    } catch (e) {
      err = e;
    }
    err.message.should.equal('Invalid value for schema path `age`')
  },

  'add() does not polute existing paths': function () {
    var o = { name: String }
    var s = new Schema(o);
    s.add({ age: Number }, 'name.');
    ;('age' in o.name).should.be.false;
  },

  // gh-700
  'nested schemas should throw': function () {
    var a = new Schema({ title: String })
      , err

    try {
      new Schema({ blah: Boolean, a: a });
    } catch (err_) {
      err = err_;
    }

    should.exist(err);
    ;/Did you try nesting Schemas/.test(err.message).should.be.true;
  },

  'non-function etters throw': function () {
    var schema = new Schema({ fun: String });
    var g, s;

    try {
      schema.path('fun').get(true);
    } catch (err_) {
      g = err_;
    }

    should.exist(g);
    g.message.should.equal('A getter must be a function.');

    try {
      schema.path('fun').set(4);
    } catch (err_) {
      s = err_;
    }

    should.exist(s);
    s.message.should.equal('A setter must be a function.');
  }

};
