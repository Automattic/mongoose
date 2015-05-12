
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
  , ObjectId = Schema.Types.ObjectId
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
            assert.ok(err.message.length > 0);
            BlogPost.findById(post, function (err, p) {
              assert.ifError(err);

              var update3 = {
                  $pull: 'fail'
              }

              BlogPost.update({ _id: post._id }, update3, function (err) {
                assert.ok(err);

                assert.ok(/Invalid atomic update value for \$pull\. Expected an object, received string/.test(err.message));

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

  it('makes copy of conditions and update options', function(done) {
    var db = start()
      , BlogPost = db.model('BlogPostForUpdates', collection);

    var conditions = { '_id': post._id.toString() };
    var update = {'$set':{'some_attrib':post._id.toString()}};
    BlogPost.update(conditions, update, function(err) {
      assert.ifError(err);
      assert.equal('string', typeof conditions._id);
      done();
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
        assert.equal(ret.date.toString(), new Date(update.$set.date).toString());

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
    it('(gh-699)', function(done){
      var db = start();
      var S = db.model('UpdateStrictSchema');
      db.close();

      var doc = S.find()._castUpdate({ ignore: true });
      assert.equal(false, doc);
      var doc = S.find()._castUpdate({ $unset: {x: 1}});
      assert.equal(1, Object.keys(doc.$unset).length);
      done();
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
    var B = db.model('BlogPostForUpdates', 'wwwwowowo'+random());
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

  it('handles $push with $ positionals (gh-1057)', function(done){
    var db = start();

    var taskSchema = new Schema({
        name: String
    })

    var componentSchema = new Schema({
        name: String
      , tasks: [taskSchema]
    });

    var projectSchema = new Schema({
        name: String
      , components: [componentSchema]
    });

    var Project = db.model('1057-project', projectSchema, '1057-'+random());

    Project.create({ name: 'my project' }, function (err, project) {
      assert.ifError(err);
      var pid = project.id;
      var comp = project.components.create({ name: 'component' });
      Project.update({ _id: pid }, { $push: { components: comp }}, function (err) {
        assert.ifError(err);
        var task = comp.tasks.create({ name: 'my task' });
        Project.update({ _id: pid, 'components._id': comp._id }, { $push : { 'components.$.tasks': task }}, function (err) {
          assert.ifError(err);
          Project.findById(pid, function (err, proj) {
            assert.ifError(err);
            assert.ok(proj);
            assert.equal(1, proj.components.length);
            assert.equal('component', proj.components[0].name);
            assert.equal(comp.id, proj.components[0].id);
            assert.equal(1, proj.components[0].tasks.length);
            assert.equal('my task', proj.components[0].tasks[0].name);
            assert.equal(task.id, proj.components[0].tasks[0].id);
            done();
          })
        });
      });
    });

  })

  it('handles nested paths starting with numbers (gh-1062)', function(done){
    var db = start()
    var schema = Schema({ counts: Schema.Types.Mixed });
    var M = db.model('gh-1062', schema, '1062-'+random());
    M.create({ counts: {} }, function (err, m) {
      assert.ifError(err);
      M.update({}, { $inc: { 'counts.1': 1, 'counts.1a': 10 }}, function (err, updated) {
        assert.ifError(err);
        M.findById(m, function (err, doc) {
          assert.ifError(err);
          assert.equal(1, doc.counts['1']);
          assert.equal(10, doc.counts['1a']);
          done();
        });
      });
    })
  })

  it('handles positional operators with referenced docs (gh-1572)', function(done){
    var db = start();

    var so = new Schema({ title : String, obj : [String] });
    var Some = db.model('Some' + random(), so);

    Some.create({ obj: ['a','b','c'] }, function (err, s) {
      assert.ifError(err);

      Some.update({ _id: s._id, obj: 'b' }, { $set: { "obj.$" : 2 }}, function(err) {
        assert.ifError(err);

        Some.findById(s._id, function (err, ss) {
          assert.ifError(err);

          assert.strictEqual(ss.obj[1], '2');
          done();
        });
      });
    });
  })

  it('use .where for update condition (gh-2170)', function(done){
    var db = start();
    var so = new Schema({ num : Number });
    var Some = db.model('gh-2170' + random(), so);

    Some.create([ {num: 1}, {num: 1} ], function(err, doc0, doc1){
      assert.ifError(err);
      var sId0 = doc0._id;
      var sId1 = doc1._id;
      Some.where({_id: sId0}).update({}, {$set: {num: '99'}}, {multi: true}, function(err, cnt){
        assert.ifError(err);
        assert.equal(1, cnt);
        Some.findById(sId0, function(err, doc0_1){
          assert.ifError(err);
          assert.equal(99, doc0_1.num);
          Some.findById(sId1, function(err, doc1_1){
            assert.ifError(err);
            assert.equal(1, doc1_1.num);
            done();
          });
        });
      });
    });
  })

  describe('mongodb 2.4 features', function(){
    var mongo24_or_greater = false;

    before(function(done){
      start.mongodVersion(function (err, version) {
        assert.ifError(err);
        mongo24_or_greater = 2 < version[0] || (2 == version[0] && 4 <= version[1]);
        done();
      })
    })

    it('$setOnInsert operator', function(done){
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 $setOnInsert feature');
        return done();
      }

      var db = start()
      var schema = Schema({ name: String, age: Number, x: String });
      var M = db.model('setoninsert-' + random(), schema);

      var match = { name: 'set on insert' };
      var op = { $setOnInsert: { age: '47' }, x: 'inserted' };
      M.update(match, op, { upsert: true }, function (err, updated) {
        assert.ifError(err);
        M.findOne(function (err, doc) {
          assert.ifError(err);
          assert.equal(47, doc.age);
          assert.equal('set on insert', doc.name);

          var match = { name: 'set on insert' };
          var op = { $setOnInsert: { age: 108 }, name: 'changed' };
          M.update(match, op, { upsert: true }, function (err, updated) {
            assert.ifError(err);

            M.findOne(function (err, doc) {
              assert.equal(47, doc.age);
              assert.equal('changed', doc.name);
              done();
            });
          });
        });
      })
    })

    it('push with $slice', function(done){
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 $push with $slice feature');
        return done();
      }

      var db = start()
      var schema = Schema({ name: String, n: [{ x: Number }] });
      var M = db.model('setoninsert-' + random(), schema);

      M.create({ name: '2.4' }, function (err, created) {
        assert.ifError(err);

        var op = { $push: { n: {
            $each: [{x:10},{x:4}, {x:1}]
          , $slice: '-1'
          , $sort: { x:1 }
        }}}

        M.update({ _id: created._id }, op, function (err) {
          assert.ifError(err);
          M.findById(created._id, function (err, doc) {
            assert.ifError(err);
            assert.equal(created.id, doc.id)
            assert.equal(1, doc.n.length);
            assert.equal(10, doc.n[0].x);
            done()
          })
        })
      })
    })
  })

  describe('mongodb 2.6 features', function() {
    var mongo26_or_greater = false;

    before(function(done) {
      start.mongodVersion(function (err, version) {
        assert.ifError(err);
        mongo26_or_greater = 2 < version[0] || (2 == version[0] && 6 <= version[1]);
        done();
      });
    });

    it('supports $position', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      var db = start();
      var schema = Schema({ name: String, n: [{ x: Number }] });
      var M = db.model('setoninsert-' + random(), schema);

      var m = new M({ name: '2.6', n: [{ x : 0 }] });
      m.save(function(error, m) {
        assert.ifError(error);
        assert.equal(1, m.n.length);
        M.update(
           { name: '2.6' },
           { $push: { n: { $each: [{x: 2}, {x: 1}], $position: 0 } } },
           function(error) {
             assert.ifError(error);
             M.findOne({ name: '2.6' }, function(error, m) {
               assert.ifError(error);
               assert.equal(3, m.n.length);
               assert.equal(2, m.n[0].x);
               assert.equal(1, m.n[1].x);
               assert.equal(0, m.n[2].x);
               done();
             });
           });
      });
    });

    it('supports $currentDate', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      var db = start();
      var schema = Schema({ name: String, lastModified: Date, lastModifiedTS: Date });
      var M = db.model('gh-2019', schema);

      var m = new M({ name: '2.6' });
      m.save(function(error, m) {
        assert.ifError(error);
        var before = Date.now();
        M.update(
           { name: '2.6' },
           { $currentDate: { lastModified: true, lastModifiedTS: { $type: 'timestamp' } } },
           function(error) {
             assert.ifError(error);
             M.findOne({ name: '2.6' }, function(error, m) {
               var after = Date.now();
               assert.ifError(error);
               assert.ok(m.lastModified.getTime() >= before);
               assert.ok(m.lastModified.getTime() <= after);
               done();
             });
           });
      });
    });
  });

  describe('{overwrite : true}', function () {
    it('overwrite works', function(done){
      var db = start()
      var schema = new Schema({ mixed: {} });
      var M = db.model('updatesmixed-' + random(), schema);

      M.create({ mixed: 'something' }, function (err, created) {
        assert.ifError(err);

        M.update({ _id: created._id }, { mixed: {} }, { overwrite : true }, function (err) {
          assert.ifError(err);
          M.findById(created._id, function (err, doc) {
            assert.ifError(err);
            assert.equal(created.id, doc.id)
            assert.equal(typeof doc.mixed, 'object');
            assert.equal(Object.keys(doc.mixed).length, 0);
            done()
          })
        })
      })
    })

    it('overwrites all properties', function(done){
      var db = start();
      var sch = new Schema({ title : String, subdoc : { name : String, num : Number }});

      var M = db.model('updateover'+random(), sch);

      M.create({ subdoc : { name : 'that', num : 1 } }, function (err, doc) {
        assert.ifError(err);

        M.update({ _id : doc.id }, { title : 'something!' }, { overwrite : true }, function (err) {
          assert.ifError(err);
          M.findById(doc.id, function (err, doc) {
            assert.ifError(err);
            assert.equal(doc.title, 'something!');
            assert.equal(doc.subdoc.name, undefined);
            assert.equal(doc.subdoc.num, undefined);
            done();
          });
        });
      });
    })

    it('allows users to blow it up', function(done){
      var db = start();
      var sch = new Schema({ title : String, subdoc : { name : String, num : Number }});

      var M = db.model('updateover'+random(), sch);

      M.create({ subdoc : { name : 'that', num : 1, title : 'hello' } }, function (err, doc) {
        assert.ifError(err);

        M.update({ _id : doc.id }, {}, { overwrite : true }, function (err) {
          assert.ifError(err);
          M.findById(doc.id, function (err, doc) {
            assert.ifError(err);
            assert.equal(doc.title, undefined);
            assert.equal(doc.subdoc.name, undefined);
            assert.equal(doc.subdoc.num, undefined);
            done();
          });
        });
      });
    })
  });

  it('casts empty arrays', function(done) {
    var db = start();

    var so = new Schema({ arr: [] });
    var Some = db.model('1838-' + random(), so);

    Some.create({ arr: ['a'] }, function (err, s) {
      if (err) return done(err);

      Some.update({ _id: s._id }, { arr: [] }, function(err) {
        if (err) return done(err);
        Some.findById(s._id, function(err, doc) {
          db.close();
          if (err) return done(err);
          assert.ok(Array.isArray(doc.arr));
          assert.strictEqual(0, doc.arr.length);
          done();
        });
      });
    });
  });

  it('works with $set and overwrite (gh-2515)', function(done) {
    var db = start();

    var schema = new Schema({ breakfast: String });
    var M = db.model('gh-2515', schema);

    M.create({ breakfast: 'bacon' }, function(error, doc) {
      assert.ifError(error);
      M.update(
        { _id: doc._id },
        { $set: { breakfast: 'eggs' } },
        { overwrite: true },
        function(error) {
          assert.ifError(error);
          M.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.breakfast, 'eggs');
            db.close(done);
          });
        });
    });
  });

  it('works with overwrite but no $set (gh-2568)', function(done) {
    var db = start();

    var chapterSchema = {
      name: String
    };
    var bookSchema = {
      chapters: [chapterSchema],
      title: String,
      author: String,
      id: Number
    };
    var Book = db.model('gh2568', bookSchema);

    var jsonObject = {
      chapters: [{name: 'Ursus'}, {name: 'The Comprachicos'}],
      name: 'The Man Who Laughs',
      author: 'Victor Hugo',
      id: 0
    };

    Book.update({}, jsonObject, { upsert: true, overwrite: true },
      function(error, book) {
        assert.ifError(error);
        Book.findOne({ id: 0 }, function(error, book) {
          assert.ifError(error);
          assert.equal(book.chapters.length, 2);
          assert.ok(book.chapters[0]._id);
          assert.ok(book.chapters[1]._id);
          done();
        });
      });
  });

  it('works with undefined date (gh-2833)', function(done) {
    var db = start();

    var dateSchema = {
      d: Date
    };
    var D = db.model('gh2833', dateSchema);

    D.update({}, { d: undefined }, function(error) {
      assert.ok(error instanceof MongooseError.CastError);
      done();
    });
  });

  it('does not add virtuals to update (gh-2046)', function(done) {
    var db = start();

    var childSchema = Schema({ foo: String }, { toObject: { getters: true } })
    var parentSchema = Schema({ children: [childSchema] });

    childSchema.virtual('bar').get(function() { return 'bar'; });

    var Parent = db.model('gh2046', parentSchema, 'gh2046');

    var update = Parent.update({}, { $push: { children: { foo: 'foo' } } }, { upsert: true });
    assert.equal(update._update.$push.children.bar, undefined);

    update.exec(function(error) {
      assert.ifError(error);
      Parent.findOne({}, function(error, doc) {
        assert.ifError(error);
        assert.equal(doc.children.length, 1);
        assert.ok(!doc.children[0].bar);
        db.close(done);
      });
    });
  });
});
