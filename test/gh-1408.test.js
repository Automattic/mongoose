
/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('documents should not be converted to _id (gh-1408)', function() {
  it('if an embedded doc', async function() {
    this.timeout(4500);

    const db = start();

    const PreferenceSchema = new Schema({
      _id: { type: Schema.ObjectId, auto: true },
      preference: { type: String, required: true },
      value: { type: Schema.Types.Mixed }
    }, { versionKey: false });

    const BrandSchema = new Schema({
      settings: {
        preferences: [PreferenceSchema]
      }
    });

    const A = db.model('Test', BrandSchema);

    const a = new A({
      settings: {
        preferences:
         [
           { preference: 'group_colors', value: false },
           { preference: 'can_force_orders', value: true },
           { preference: 'hide_from_buyers', value: true },
           { preference: 'no_orders', value: '' }
         ]
      }
    });

    await a.save();

    const doc = await A.findById(a);

    const newData = {
      settings: {
        preferences: [
          { preference: 'group_colors', value: true },
          { preference: 'can_force_orders', value: true },
          { preference: 'custom_csv', value: '' },
          { preference: 'hide_from_buyers', value: false },
          { preference: 'nozoom', value: false },
          { preference: 'no_orders', value: false }
        ]
      }
    };

    doc.set('settings', newData.settings, { merge: true });
    doc.markModified('settings'); // <== this caused the bug
    await doc.save();

    const doc2 = await A.findById(doc);


    doc2.settings.preferences.forEach(function(pref, i) {
      assert.equal(pref.preference, newData.settings.preferences[i].preference);
      assert.equal(pref.value, newData.settings.preferences[i].value);
    });

    await db.close();
  });
});
