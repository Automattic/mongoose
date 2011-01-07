
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
      , age:      : Number
      , checkins  : [Checkin]
      , friends   : [ObjectId]
    });

    var Checkin = new Schema({
        date      : Date 
      , location  : {
            lat:    Number
          , lng:    Number
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

    Person.get('name').should.be.instanceof(SchemaTypes.String);
    Person.get('raccons').should.be.instanceof(SchemaTypes.DocumentArray);
    Person.get('location.city').should.be.instanceof(SchemaTypes.String);
    Person.get('location.state').should.be.instanceof(SchemaTypes.String);
  }

};
