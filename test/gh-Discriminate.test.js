// This causes a problem run().catch(err => console.log(err));
describe('Disallow Discriminator Key', function() {
    const assert = require('assert');
    const mongoose = require('mongoose');
    mongoose.set('debug', true);
    mongoose.set('useFindAndModify', false);
    const { Schema } = mongoose;
      it('(gh-9015)', function() {
        async function run() {
          await mongoose.connect('mongodb://localhost:27017/test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
          });
    
          await mongoose.connection.dropDatabase();
    
          const baseSchema = new Schema({}, { discriminatorKey: 'type' });
          const baseModel = mongoose.model('thing', baseSchema);
    
          const aSchema = new Schema(
            {
              aThing: { type: Number },
            },
            { _id: false, id: false },
          );
          const aModel = baseModel.discriminator('A', aSchema);
    
          const bSchema = new Schema(
            {
              bThing: { type: String },
            },
            { _id: false, id: false },
          );
          const bModel = baseModel.discriminator('B', bSchema);
    
          // Model is created as a type A
          const doc = await baseModel.create({ type: 'A', aThing: 1 });
    
          const res = await baseModel.findByIdAndUpdate(
            doc._id,
            { type: 'A', bThing: 'one', aThing: '2' },
            { runValidators: true, /*overwriteDiscriminatorKey: true*/ },
          );
          assert.equal(res.type, 'B');
          }
      });
    });