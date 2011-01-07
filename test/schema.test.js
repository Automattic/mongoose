
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , Schema = mongoose.Schema
  , SchemaTypes = mongoose.SchemaTypes;

/**
 * Test.
 */

module.exports = {

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

    Person.get('name').should.be.instanceof(SchemaTypes.String);
    Person.get('raccons').should.be.instanceof(SchemaTypes.DocumentArray);
    Person.get('location.city').should.be.instanceof(SchemaTypes.String);
    Person.get('location.state').should.be.instanceof(SchemaTypes.String);
  }

};
