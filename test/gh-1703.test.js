
/**
 * Test dependencies.
 */

var start = require('./common')
    , assert = require('assert')
    , mongoose = start.mongoose
    , random = require('../lib/utils').random
    , Query = require('../lib/query')
    , Schema = mongoose.Schema
    , SchemaType = mongoose.SchemaType
    , CastError = mongoose.Error.CastError
    , ValidatorError = mongoose.Error.ValidatorError
    , ValidationError = mongoose.Error.ValidationError
    , ObjectId = Schema.Types.ObjectId
    , DocumentObjectId = mongoose.Types.ObjectId
    , DocumentArray = mongoose.Types.DocumentArray
    , EmbeddedDocument = mongoose.Types.Embedded
    , MongooseArray = mongoose.Types.Array
    , MongooseError = mongoose.Error;

describe('(gh-1703) Dont pluralize collection names that dont end with a lowercase letter', function(){
    it('should not pluralize _temp_', function(done){
        var db = start();

        var ASchema = new Schema ({
            value: { type: Schema.Types.Mixed }
        });

        var collectionName = '_temp_';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName);
        done();
    });
    it('should pluralize _temp', function(done){
        var db = start();

        var ASchema = new Schema ({
            value: { type: Schema.Types.Mixed }
        });

        var collectionName = '_temp';
        var A = db.model(collectionName, ASchema);
        assert.equal(A.collection.name, collectionName + 's');
        done();
    })
});
