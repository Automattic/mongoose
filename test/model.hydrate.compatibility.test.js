'use strict';

const assert = require('assert');
const start = require('./common');
const { clearTestData } = require('./util');
const mongoose = start.mongoose;
const { Schema } = mongoose;

describe('Model hydration compatibility', function() {
  let db;

  beforeEach(function() {
    db = start();
    db.deleteModel(/.*/);
  });

  afterEach(async function() {
    await clearTestData(db);
    await db.close();
  });

  describe('Invalid single subdocuments retain deferred validation', function() {
    for (const virtuals of [undefined, false, true]) {
      for (const child of [17, ['invalid']]) {
        it(`retains a validation error for ${JSON.stringify(child)} with virtuals=${virtuals}`, function() {
          // Arrange
          const { Customer } = createTestContext();

          // Act
          const doc = Customer.hydrate({ child }, null, { virtuals });
          const error = doc.validateSync();

          // Assert
          assert.ok(error);
          assert.strictEqual(error.errors.child.kind, 'cast');
          assert.strictEqual(error.errors.child.path, 'child');
        });
      }
    }

    function createTestContext() {
      const child = new Schema({ name: String });
      return { Customer: db.model('Customer', new Schema({ child })) };
    }
  });

  describe('Whole-array setters retain their option behavior', function() {
    for (const virtuals of [false, true]) {
      for (const setters of [false, true]) {
        it(`applies the array setter only when requested, virtuals=${virtuals}, setters=${setters}`, function() {
          // Arrange
          const { Customer } = createTestContext();

          // Act
          const doc = Customer.hydrate({ names: ['ADA', 'GRACE'] }, null, { virtuals, setters });

          // Assert
          assert.deepStrictEqual(Array.from(doc.names), setters ? ['ada', 'grace'] : ['ADA', 'GRACE']);
        });
      }
    }

    function createTestContext() {
      const schema = new Schema({ names: { type: [String], set: values => values.map(value => value.toLowerCase()) } });
      return { Customer: db.model('Customer', schema) };
    }
  });

  describe('Map document-array children save nested changes', function() {
    for (const mode of ['query', 'omitted', 'false', 'true']) {
      for (const field of ['names', 'people', 'labels']) {
        it(`saves ${field} after ${mode} hydration`, async function() {
          // Arrange
          const { Customer, raw } = createTestContext();
          await Customer.collection.insertOne(raw);
          const doc = mode === 'query' ? await Customer.findById(raw._id) :
            Customer.hydrate(raw, null, mode === 'omitted' ? undefined : { virtuals: mode === 'true' });
          const contact = doc.groups.get('home')[0];

          // Act
          if (field === 'names') {
            contact.names.push('Grace');
          } else if (field === 'people') {
            contact.people.push({ name: 'Grace' });
          } else {
            contact.labels.set('work', 'Work');
          }
          await doc.save();
          const saved = await Customer.findById(raw._id).lean();

          // Assert
          assert.deepStrictEqual(saved.groups, { home: [{
            names: field === 'names' ? ['Ada', 'Grace'] : ['Ada'],
            people: field === 'people' ? [{ name: 'Ada' }, { name: 'Grace' }] : [{ name: 'Ada' }],
            labels: field === 'labels' ? { home: 'Home', work: 'Work' } : { home: 'Home' }
          }] });
        });
      }
    }

    function createTestContext() {
      const person = new Schema({ name: String }, { _id: false });
      const contact = new Schema({ names: [String], people: [person], labels: { type: Map, of: String } }, { _id: false });
      return {
        Customer: db.model('Customer', new Schema({ groups: { type: Map, of: [contact] } })),
        raw: {
          _id: new mongoose.Types.ObjectId(),
          groups: { home: [{ names: ['Ada'], people: [{ name: 'Ada' }], labels: { home: 'Home' } }] }
        }
      };
    }
  });

  describe('Virtual hydration preserves the population default', function() {
    for (const justOne of [false, true]) {
      it(`keeps plain populated values without resolving an unregistered model, justOne=${justOne}`, function() {
        // Arrange
        const { Customer, raw, expected } = createTestContext(justOne);

        // Act
        const doc = Customer.hydrate(raw, null, { virtuals: true });

        // Assert
        assert.deepStrictEqual(doc.contact, expected);
      });

      it(`requires the model when populated hydration is explicitly enabled, justOne=${justOne}`, function() {
        // Arrange
        const { Customer, raw } = createTestContext(justOne);

        // Act and Assert
        assert.throws(() => Customer.hydrate(raw, null, { virtuals: true, hydratedPopulatedDocs: true }),
          mongoose.Error.MissingSchemaError);
      });

      it(`hydrates registered models when explicitly enabled, justOne=${justOne}`, function() {
        // Arrange
        const { Customer, raw } = createTestContext(justOne);
        const Contact = db.model('Contact', new Schema({ name: String }));

        // Act
        const doc = Customer.hydrate(raw, null, { virtuals: true, hydratedPopulatedDocs: true });
        const contact = justOne ? doc.contact : doc.contact[0];

        // Assert
        assert.ok(contact instanceof Contact);
        assert.strictEqual(contact.name, 'Ada');
      });
    }

    function createTestContext(justOne) {
      const schema = new Schema({});
      schema.virtual('contact', { ref: 'Contact', localField: '_id', foreignField: '_id', justOne });
      const payload = justOne ? { name: 'Ada' } : [{ name: 'Ada' }];
      return {
        Customer: db.model('Customer', schema),
        raw: { contact: payload },
        expected: justOne ? { name: 'Ada' } : [{ name: 'Ada' }]
      };
    }
  });

  describe('Mixed reference arrays in Maps retain bare IDs', function() {
    for (const virtuals of [undefined, false, true]) {
      for (const named of [false, true]) {
        it(`preserves bare IDs after ${named ? 'named' : 'root'} depopulation, virtuals=${virtuals}`, function() {
          // Arrange
          const { Customer } = createTestContext();
          const customer = Customer.hydrate({ contacts: {
            home: [{ _id: 'ada', name: 'Ada' }, 'grace']
          } }, null, { hydratedPopulatedDocs: true, virtuals });

          // Act
          if (named) {
            customer.depopulate('contacts.home');
          } else {
            customer.depopulate();
          }

          // Assert
          assert.ok(customer.contacts instanceof Map);
          assert.deepStrictEqual(Array.from(customer.contacts), [['home', ['ada', 'grace']]]);
        });
      }
    }

    function createTestContext() {
      const m = new mongoose.Mongoose();
      m.model('Contact', new Schema({ _id: String, name: String }));
      const Customer = m.model('Customer', new Schema({
        contacts: { type: Map, of: [{ type: String, ref: 'Contact' }] }
      }));
      return { Customer };
    }
  });
});
