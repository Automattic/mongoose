
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
  , CastError = SchemaType.CastError
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

/**
 * Setup.
 */

var Comments = new Schema;

Comments.add({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

var BlogPost = new Schema({
    title     : String
  , author    : String
  , slug      : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
    }
  , published : Boolean
  , mixed     : {}
  , numbers   : [Number]
  , owners    : [ObjectId]
  , comments  : [Comments]
}, { strict: false });

BlogPost.virtual('titleWithAuthor')
  .get(function () {
    return this.get('title') + ' by ' + this.get('author');
  })
  .set(function (val) {
    var split = val.split(' by ');
    this.set('title', split[0]);
    this.set('author', split[1]);
  });

BlogPost.method('cool', function(){
  return this;
});

BlogPost.static('woot', function(){
  return this;
});

mongoose.model('BlogPostForUpdates', BlogPost);

var collection = 'blogposts_' + random();

var strictSchema = new Schema({ name: String, x: { nested: String }});
strictSchema.virtual('foo').get(function () {
  return 'i am a virtual FOO!'
});
mongoose.model('UpdateStrictSchema', strictSchema);


describe('model: update:', function(){
  var post
    , title = 'Tobi ' + random()
    , author = 'Brian ' + random()
    , newTitle = 'Woot ' + random()
    , id0
    , id1

  before(function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    id0 = new DocumentObjectId
    id1 = new DocumentObjectId

    post = new BlogPost;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4,5,6,7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    post.save(function (err) {
      assert.ifError(err);
      done();
    });
  });

  it('works', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    BlogPost.findById(post._id, function (err, cf) {
      assert.ifError(err);
      assert.equal(title, cf.title);
      assert.equal(cf.author,author);
      assert.equal(cf.meta.visitors.valueOf(),0);
      assert.equal(cf.date.toString(), post.date.toString());
      assert.equal(true, cf.published);
      assert.equal('ex', cf.mixed.x);
      assert.deepEqual(cf.numbers.toObject(), [4,5,6,7]);
      assert.equal(cf.owners.length, 2)
      assert.equal(cf.owners[0].toString(), id0.toString());
      assert.equal(cf.owners[1].toString(), id1.toString());
      assert.equal(cf.comments.length, 2);
      assert.equal(cf.comments[0].body, 'been there');
      assert.equal(cf.comments[1].body, 'done that');
      assert.ok(cf.comments[0]._id);
      assert.ok(cf.comments[1]._id);
      assert.ok(cf.comments[0]._id instanceof DocumentObjectId)
      assert.ok(cf.comments[1]._id instanceof DocumentObjectId);

      var update = {
          title: newTitle // becomes $set
        , $inc: { 'meta.visitors': 2 }
        , $set: { date: new Date }
        , published: false // becomes $set
        , 'mixed': { x: 'ECKS', y: 'why' } // $set
        , $pullAll: { 'numbers': [4, 6] }
        , $pull: { 'owners': id0 }
        , 'comments.1.body': 8 // $set
      }

      BlogPost.update({ title: title }, update, function (err) {
        assert.ifError(err);

        BlogPost.findById(post._id, function (err, up) {
          assert.ifError(err);
          assert.equal(up.title,newTitle);
          assert.equal(up.author,author);
          assert.equal(up.meta.visitors.valueOf(), 2);
          assert.equal(up.date.toString(),update.$set.date.toString());
          assert.equal(up.published, false);
          assert.equal(up.mixed.x, 'ECKS');
          assert.equal(up.mixed.y,'why');
          assert.deepEqual(up.numbers.toObject(), [5,7]);
          assert.equal(up.owners.length, 1);
          assert.equal(up.owners[0].toString(), id1.toString());
          assert.equal(up.comments[0].body,'been there');
          assert.equal(up.comments[1].body,'8');
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId)
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);

          var update2 = {
              'comments.body': 'fail'
          }

          BlogPost.update({ _id: post._id }, update2, function (err) {
            assert.ok(err);
            assert.ok(/^can't append to array using string field name \[body\]/.test(err.message));
            BlogPost.findById(post, function (err, p) {
              assert.ifError(err);

              var update3 = {
                  $pull: 'fail'
              }

              BlogPost.update({ _id: post._id }, update3, function (err) {
                assert.ok(err);
                assert.ok(/Invalid atomic update value/.test(err.message));

                var update4 = {
                    $inc: { idontexist: 1 }
                }

                // should not overwrite doc when no valid paths are submitted
                BlogPost.update({ _id: post._id }, update4, function (err) {
                  assert.ifError(err);

                  BlogPost.findById(post._id, function (err, up) {
                    db.close();
                    assert.ifError(err);

                    assert.equal(up.title,newTitle);
                    assert.equal(up.author,author);
                    assert.equal(up.meta.visitors.valueOf(),2);
                    assert.equal(up.date.toString(),update.$set.date.toString());
                    assert.equal(up.published,false);
                    assert.equal(up.mixed.x,'ECKS');
                    assert.equal(up.mixed.y,'why');
                    assert.deepEqual(up.numbers.toObject(),[5,7]);
                    assert.equal(up.owners.length, 1);
                    assert.equal(up.owners[0].toString(), id1.toString());
                    assert.equal(up.comments[0].body, 'been there');
                    assert.equal(up.comments[1].body, '8');
                    // non-schema data was still stored in mongodb
                    assert.strictEqual(1, up._doc.idontexist);

                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('casts doc arrays', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var update = {
        comments: [{ body: 'worked great' }]
      , $set: {'numbers.1': 100}
      , $inc: { idontexist: 1 }
    }

    BlogPost.update({ _id: post._id }, update, function (err) {
      assert.ifError(err);

      // get the underlying doc
      BlogPost.collection.findOne({ _id: post._id }, function (err, doc) {
        db.close();
        assert.ifError(err);

        var up = new BlogPost;
        up.init(doc);
        assert.equal(up.comments.length, 1);
        assert.equal(up.comments[0].body, 'worked great');
        assert.strictEqual(true, !! doc.comments[0]._id);
        assert.equal(2,up.meta.visitors.valueOf());
        assert.equal(up.mixed.x,'ECKS');
        assert.deepEqual(up.numbers.toObject(),[5,100]);
        assert.strictEqual(up.numbers[1].valueOf(),100);

        assert.equal(2, doc.idontexist);
        assert.equal(100, doc.numbers[1]);

        done();
      });
    });
  })

  it('handles $pushAll array of docs', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var update = {
        $pushAll: { comments: [{ body: 'i am number 2' }, { body: 'i am number 3' }] }
    }

    BlogPost.update({ _id: post._id }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(3, ret.comments.length);
        assert.equal(ret.comments[1].body,'i am number 2');
        assert.strictEqual(true, !! ret.comments[1]._id);
        assert.ok(ret.comments[1]._id instanceof DocumentObjectId)
        assert.equal(ret.comments[2].body,'i am number 3');
        assert.strictEqual(true, !! ret.comments[2]._id);
        assert.ok(ret.comments[2]._id instanceof DocumentObjectId)
        done();
      })
    });
  })

  it('handles $pull of object literal array of docs (gh-542)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var update = {
        $pull: { comments: { body: 'i am number 2' } }
    }

    BlogPost.update({ _id: post._id }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(2, ret.comments.length);
        assert.equal(ret.comments[0].body,'worked great');
        assert.ok(ret.comments[0]._id instanceof DocumentObjectId)
        assert.equal(ret.comments[1].body,'i am number 3');
        assert.ok(ret.comments[1]._id instanceof DocumentObjectId)
        done();
      })
    });
  });

  it('handles weird casting (gh-479)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    function a () {};
    a.prototype.toString = function () { return 'MongoDB++' }
    var crazy = new a;

    var update = {
        $addToSet: { 'comments.$.comments': { body: 'The Ring Of Power' } }
      , $set: { 'comments.$.title': crazy }
    }

    BlogPost.update({ _id: post._id, 'comments.body': 'worked great' }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(2, ret.comments.length);
        assert.equal(ret.comments[0].body, 'worked great');
        assert.equal(ret.comments[0].title,'MongoDB++');
        assert.strictEqual(true, !! ret.comments[0].comments);
        assert.equal(ret.comments[0].comments.length, 1);
        assert.strictEqual(ret.comments[0].comments[0].body, 'The Ring Of Power');
        assert.ok(ret.comments[0]._id instanceof DocumentObjectId);
        assert.ok(ret.comments[0].comments[0]._id instanceof DocumentObjectId);
        assert.equal(ret.comments[1].body,'i am number 3');
        assert.strictEqual(undefined, ret.comments[1].title);
        assert.ok(ret.comments[1]._id instanceof DocumentObjectId)
        done();
      })
    });
  })

  var last;
  it('handles date casting (gh-479)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var update = {
        $inc: { 'comments.$.newprop': '1' }
      , $set: { date: (new Date).getTime() } // check for single val casting
    }

    BlogPost.update({ _id: post._id, 'comments.body': 'worked great' }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(1, ret._doc.comments[0]._doc.newprop);
        assert.strictEqual(undefined, ret._doc.comments[1]._doc.newprop);
        assert.ok(ret.date instanceof Date);
        assert.equal(ret.date.toString(), update.$set.date.toString());

        last = ret;
        done();
      })
    });
  });

  it('handles $addToSet (gh-545)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var owner = last.owners[0];

    var update = {
        $addToSet: { 'owners': owner }
    }

    BlogPost.update({ _id: post._id }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(1, ret.owners.length);
        assert.equal(ret.owners[0].toString(), owner.toString());

        last = ret;
        done();
      })
    });
  });

  it('handles $addToSet with $each (gh-545)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var owner = last.owners[0]
      , newowner = new DocumentObjectId

    var update = {
        $addToSet: { 'owners': { $each: [owner, newowner] }}
    }

    BlogPost.update({ _id: post._id }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(2, ret.owners.length);
        assert.equal(ret.owners[0].toString(), owner.toString());
        assert.equal(ret.owners[1].toString(), newowner.toString());

        last = newowner;
        done();
      })
    });
  });

  it('handles $pop and $unset (gh-574)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var update = {
        $pop: { 'owners': -1 }
      , $unset: { title: 1 }
    }


    BlogPost.update({ _id: post._id }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(1, ret.owners.length);
        assert.equal(ret.owners[0].toString(), last.toString());
        assert.strictEqual(undefined, ret.title);
        done();
      });
    });
  });

  it('works with nested positional notation', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    var update = {
        $set: {
            'comments.0.comments.0.date': '11/5/2011'
          , 'comments.1.body': 9000
        }
    }

    BlogPost.update({ _id: post._id }, update, function (err) {
      assert.ifError(err);
      BlogPost.findById(post, function (err, ret) {
        db.close();
        assert.ifError(err);
        assert.equal(2, ret.comments.length, 2);
        assert.equal(ret.comments[0].body, 'worked great');
        assert.equal(ret.comments[1].body, '9000');
        assert.equal(ret.comments[0].comments[0].date.toString(), new Date('11/5/2011').toString())
        assert.equal(ret.comments[1].comments.length, 0);
        done();
      })
    });
  });

  it('handles $pull with obj literal (gh-542)', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    BlogPost.findById(post, function (err, last) {
      assert.ifError(err);

      var update = {
          $pull: { comments: { _id: last.comments[0].id } }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        assert.ifError(err);
        BlogPost.findById(post, function (err, ret) {
          db.close();
          assert.ifError(err);
          assert.equal(1, ret.comments.length);
          assert.equal(ret.comments[0].body, '9000');
          done();
        })
      });
    });
  });

  it('handles $pull of obj literal and nested $in', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    BlogPost.findById(post, function (err, last) {
      assert.ifError(err);
      var update = {
          $pull: { comments: { body: { $in: [last.comments[0].body] }} }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        assert.ifError(err);
        BlogPost.findById(post, function (err, ret) {
          db.close();
          assert.ifError(err);
          assert.equal(0, ret.comments.length);

          last = ret;
          done();
        })
      });
    });
  });

  it('handles $pull and nested $nin', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)

    BlogPost.findById(post, function (err, last) {
      assert.ifError(err);

      last.comments.push({body: 'hi'}, {body:'there'});
      last.save(function (err) {
        assert.ifError(err);
        BlogPost.findById(post, function (err, ret) {
          assert.ifError(err);
          assert.equal(2, ret.comments.length);

          var update = {
              $pull: { comments: { body: { $nin: ['there'] }} }
          }

          BlogPost.update({ _id: ret._id }, update, function (err) {
            assert.ifError(err);
            BlogPost.findById(post, function (err, ret) {
              db.close();
              assert.ifError(err);
              assert.equal(1, ret.comments.length);
              done();
            })
          });
        })
      });
    })
  })

  it('updates numbers atomically', function(done){
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection)
      , totalDocs = 4
      , saveQueue = [];

    var post = new BlogPost;
    post.set('meta.visitors', 5);

    post.save(function(err){
      assert.ifError(err);

      for (var i = 0; i < 4; ++i) {
        BlogPost
        .update({ _id: post._id }, { $inc: { 'meta.visitors': 1 }}, function (err) {
          assert.ifError(err);
          --totalDocs || complete();
        });
      }

      function complete () {
        BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
          db.close();
          assert.ifError(err);
          assert.equal(9, doc.get('meta.visitors'));
          done();
        });
      };
    });
  });

  describe('honors strict schemas', function(){
    it('(gh-699)', function(){
      var db = start();
      var S = db.model('UpdateStrictSchema');
      db.close();

      var doc = S.find()._castUpdate({ ignore: true });
      assert.equal(false, doc);
      var doc = S.find()._castUpdate({ $unset: {x: 1}});
      assert.equal(1, Object.keys(doc.$unset).length);
    });

    it('works', function(done){
      var db = start();
      var S = db.model('UpdateStrictSchema');
      var s = new S({ name: 'orange crush' });

      s.save(function (err) {
        assert.ifError(err);

        S.update({ _id: s._id }, { ignore: true }, function (err, affected) {
          assert.ifError(err);
          assert.equal(0, affected);

          S.findById(s._id, function (err, doc) {
            assert.ifError(err);
            assert.ok(!doc.ignore);
            assert.ok(!doc._doc.ignore);

            S.update({ _id: s._id }, { name: 'Drukqs', foo: 'fooey' }, function (err, affected) {
              assert.ifError(err);
              assert.equal(1, affected);

              S.findById(s._id, function (err, doc) {
                db.close();
                assert.ifError(err);
                assert.ok(!doc._doc.foo);
                done();
              });
            });
          });
        });
      });
    });
  });

  it('passes number of affected docs', function(done){
    var db = start()
      , B = db.model('BlogPostForUpdates', 'wwwwowowo'+random())

    B.create({ title: 'one'},{title:'two'},{title:'three'}, function (err) {
      assert.ifError(err);
      B.update({}, { title: 'newtitle' }, { multi: true }, function (err, affected) {
        db.close();
        assert.ifError(err);
        assert.equal(3, affected);
        done();
      });
    });
  });

  it('updates a number to null (gh-640)', function(done){
    var db = start()
    var B = db.model('BlogPostB')
    var b = new B({ meta: { visitors: null }});
    b.save(function (err) {
      assert.ifError(err);
      B.findById(b, function (err, b) {
        assert.ifError(err);
        assert.strictEqual(b.meta.visitors, null);

        B.update({ _id: b._id }, { meta: { visitors: null }}, function (err, docs) {
          db.close();
          assert.strictEqual(null, err);
          done();
        });
      });
    });
  })

  it('handles $pull from Mixed arrays (gh-735)', function(done){
    var db = start();
    var schema = new Schema({ comments: [] });
    var M = db.model('gh-735', schema, 'gh-735_'+random());
    M.create({ comments: [{ name: 'node 0.8' }] }, function (err, doc) {
      assert.ifError(err);
      M.update({ _id: doc._id }, { $pull: { comments: { name: 'node 0.8' }}}, function (err, affected) {
        assert.ifError(err);
        assert.equal(1, affected);
        db.close();
        done();
      });
    });
  });

});
