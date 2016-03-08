
/**
 * Test dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema;

describe('schema options.timestamps', function() {
  describe('create schema with options.timestamps', function() {
    it('should have createdAt and updatedAt fields', function(done) {
      var TestSchema = new Schema({
        name: String
      }, {
        timestamps: true
      });

      assert.ok(TestSchema.path('createdAt'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updatedAt fields', function(done) {
      var TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updatedAt'));
      done();
    });

    it('should have created and updated fields', function(done) {
      var TestSchema = new Schema({
        name: String
      }, {
        timestamps: {
          createdAt: 'created',
          updatedAt: 'updated'
        }
      });

      assert.ok(TestSchema.path('created'));
      assert.ok(TestSchema.path('updated'));
      done();
    });
  });

  describe('auto update createdAt and updatedAt when create/save/update document', function() {
    var CatSchema = new Schema({
      name: String,
      hobby: String
    }, {timestamps: true});

    var conn = start();
    var Cat = conn.model('Cat', CatSchema);

    before(function(done) {
      Cat.remove({}, done);
    });

    it('should have fields when create', function(done) {
      var cat = new Cat({name: 'newcat'});
      cat.save(function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
        done();
      });
    });

    it('should have fields when create with findOneAndUpdate', function(done) {
      Cat.findOneAndUpdate({name: 'notexistname'}, {$set: {}}, {upsert: true, new: true}, function(err, doc) {
        assert.ok(doc.createdAt);
        assert.ok(doc.updatedAt);
        assert.ok(doc.createdAt.getTime() === doc.updatedAt.getTime());
        done();
      });
    });

    it('should change updatedAt when save', function(done) {
      Cat.findOne({name: 'newcat'}, function(err, doc) {
        var old = doc.updatedAt;

        doc.save(function(err, doc) {
          assert.ok(doc.updatedAt.getTime() > old.getTime());
          done();
        });
      });
    });

    it('should change updatedAt when findOneAndUpdate', function(done) {
      Cat.findOne({name: 'newcat'}, function(err, doc) {
        var old = doc.updatedAt;
        Cat.findOneAndUpdate({name: 'newcat'}, {$set: {hobby: 'fish'}}, {new: true}, function(err, doc) {
          assert.ok(doc.updatedAt.getTime() > old.getTime());
          done();
        });
      });
    });

    it('should have fields when update', function(done) {
      Cat.findOne({name: 'newcat'}, function(err, doc) {
        var old = doc.updatedAt;
        Cat.update({name: 'newcat'}, {$set: {hobby: 'fish'}}, function() {
          Cat.findOne({name: 'newcat'}, function(err, doc) {
            assert.ok(doc.updatedAt.getTime() > old.getTime());
            done();
          });
        });
      });
    });

    it('should have createdAt and updatedAt fields as unix timestamps', function(done) {
      var CatSchema = new Schema({
        name: String
      }, {
        timestamps: {
          fieldType: Number,
          dateFunc: function () {
            return Math.round(new Date().getTime()/1000); /* timestamp in seconds */
          }
        },
      });

      var conn = start();
      var Cat = conn.model('Cat', CatSchema);

      var newCat = new Cat({name: 'newcat'});
      newCat.save(function (err) {
        Cat.findById(newCat._id, function (err, doc) {
          assert.ok(typeof(doc.createdAt) === 'number');
          assert.ok(typeof(doc.updatedAt) === 'number');
        });
      });
      
      done();
    });

    it('should change updatedAt timestamp', function(done) {
      var CatSchema = new Schema({
        name: String
      }, {
        timestamps: {
          fieldType: Number,
          dateFunc: function () {
            return Math.round(new Date().getTime()/1000); /* timestamp in seconds */
          }
        },
      });

      var conn = start();
      var Cat = conn.model('Cat', CatSchema);

      var newCat = new Cat({name: 'newcat'});
      newCat.save(function (err) {
        Cat.update({_id: newCat._id}, {name: 'newcat2'}, function (err, doc) {
          /**
           * Update returns unchanged document, so find it again.
           */
          setTimeout(function () {
            Cat.findById(newCat._id, function (err, doc) {
              assert.ok(doc.createdAt === newCat.createdAt);
              assert.ok(doc.updatedAt >= newCat.updatedAt);
              done();
            });
          }, 1000);
        });
      });
    });

    it('should not change createdAt if doc.save() is called more than once', function(done) {
      var CatSchema = new Schema({
        name: String
      }, {
        timestamps: {
          fieldType: Number,
          dateFunc: function () {
            return Math.round(new Date().getTime()/1000); /* timestamp in seconds */
          }
        },
      });

      var conn = start();
      var Cat = conn.model('Cat', CatSchema);

      var newCat = new Cat({name: 'newcat'});
      newCat.save(function (err) {
        newCat.name = 'newcat2';
        
        newCat.save(function () {
          setTimeout(function () {
            Cat.findById(newCat._id, function (err, doc) {
              assert.ok(doc.createdAt === newCat.createdAt);
              assert.ok(doc.updatedAt >= newCat.updatedAt);
              done();
            });
          }, 1000);

          done();
        });
      });
    });


    after(function(done) {
      console.log('after');
      Cat.remove({}, function() {
        conn.close(done);
      });
    });
  });
});
