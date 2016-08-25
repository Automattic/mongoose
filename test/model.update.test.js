/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId,
    DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Setup.
 */

var Comments = new Schema({});

Comments.add({
  title: String,
  date: Date,
  body: String,
  comments: [Comments]
});

var BlogPost = new Schema({
  title: String,
  author: String,
  slug: String,
  date: Date,
  meta: {
    date: Date,
    visitors: Number
  },
  published: Boolean,
  mixed: {},
  numbers: [Number],
  owners: [ObjectId],
  comments: [Comments]
}, {strict: false});

BlogPost.virtual('titleWithAuthor')
.get(function() {
  return this.get('title') + ' by ' + this.get('author');
})
.set(function(val) {
  var split = val.split(' by ');
  this.set('title', split[0]);
  this.set('author', split[1]);
});

BlogPost.method('cool', function() {
  return this;
});

BlogPost.static('woot', function() {
  return this;
});

mongoose.model('BlogPostForUpdates', BlogPost);

var collection = 'blogposts_' + random();

var strictSchema = new Schema({name: String, x: {nested: String}});
strictSchema.virtual('foo').get(function() {
  return 'i am a virtual FOO!';
});
mongoose.model('UpdateStrictSchema', strictSchema);


describe('model: update:', function() {
  var post,
      title = 'Tobi ' + random(),
      author = 'Brian ' + random(),
      newTitle = 'Woot ' + random(),
      id0,
      id1;

  before(function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    id0 = new DocumentObjectId;
    id1 = new DocumentObjectId;

    post = new BlogPost;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = {x: 'ex'};
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{body: 'been there'}, {body: 'done that'}];

    post.save(function(err) {
      assert.ifError(err);
      db.close(done);
    });
  });

  it('works', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    BlogPost.findById(post._id, function(err, cf) {
      assert.ifError(err);
      assert.equal(cf.title, title);
      assert.equal(cf.author, author);
      assert.equal(cf.meta.visitors.valueOf(), 0);
      assert.equal(cf.date.toString(), post.date.toString());
      assert.equal(cf.published, true);
      assert.equal(cf.mixed.x, 'ex');
      assert.deepEqual(cf.numbers.toObject(), [4, 5, 6, 7]);
      assert.equal(cf.owners.length, 2);
      assert.equal(cf.owners[0].toString(), id0.toString());
      assert.equal(cf.owners[1].toString(), id1.toString());
      assert.equal(cf.comments.length, 2);
      assert.equal(cf.comments[0].body, 'been there');
      assert.equal(cf.comments[1].body, 'done that');
      assert.ok(cf.comments[0]._id);
      assert.ok(cf.comments[1]._id);
      assert.ok(cf.comments[0]._id instanceof DocumentObjectId);
      assert.ok(cf.comments[1]._id instanceof DocumentObjectId);

      var update = {
        title: newTitle, // becomes $set
        $inc: {'meta.visitors': 2},
        $set: {date: new Date},
        published: false, // becomes $set
        mixed: {x: 'ECKS', y: 'why'}, // $set
        $pullAll: {numbers: [4, 6]},
        $pull: {owners: id0},
        'comments.1.body': 8 // $set
      };

      BlogPost.update({title: title}, update, function(err) {
        assert.ifError(err);

        BlogPost.findById(post._id, function(err, up) {
          assert.ifError(err);
          assert.equal(up.title, newTitle);
          assert.equal(up.author, author);
          assert.equal(up.meta.visitors.valueOf(), 2);
          assert.equal(up.date.toString(), update.$set.date.toString());
          assert.equal(up.published, false);
          assert.equal(up.mixed.x, 'ECKS');
          assert.equal(up.mixed.y, 'why');
          assert.deepEqual(up.numbers.toObject(), [5, 7]);
          assert.equal(up.owners.length, 1);
          assert.equal(up.owners[0].toString(), id1.toString());
          assert.equal(up.comments[0].body, 'been there');
          assert.equal(up.comments[1].body, '8');
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId);
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);

          var update2 = {
            'comments.body': 'fail'
          };

          BlogPost.update({_id: post._id}, update2, function(err) {
            assert.ok(err);
            assert.ok(err.message.length > 0);
            BlogPost.findById(post, function(err) {
              assert.ifError(err);

              var update3 = {
                $pull: 'fail'
              };

              BlogPost.update({_id: post._id}, update3, function(err) {
                assert.ok(err);

                assert.ok(/Invalid atomic update value for \$pull\. Expected an object, received string/.test(err.message));

                var update4 = {
                  $inc: {idontexist: 1}
                };

                // should not overwrite doc when no valid paths are submitted
                BlogPost.update({_id: post._id}, update4, function(err) {
                  assert.ifError(err);

                  BlogPost.findById(post._id, function(err, up) {
                    assert.ifError(err);

                    assert.equal(up.title, newTitle);
                    assert.equal(up.author, author);
                    assert.equal(up.meta.visitors.valueOf(), 2);
                    assert.equal(up.date.toString(), update.$set.date.toString());
                    assert.equal(up.published, false);
                    assert.equal(up.mixed.x, 'ECKS');
                    assert.equal(up.mixed.y, 'why');
                    assert.deepEqual(up.numbers.toObject(), [5, 7]);
                    assert.equal(up.owners.length, 1);
                    assert.equal(up.owners[0].toString(), id1.toString());
                    assert.equal(up.comments[0].body, 'been there');
                    assert.equal(up.comments[1].body, '8');
                    // non-schema data was still stored in mongodb
                    assert.strictEqual(1, up._doc.idontexist);

                    db.close(done);
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  it('casts doc arrays', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var update = {
      comments: [{body: 'worked great'}],
      $set: {'numbers.1': 100},
      $inc: {idontexist: 1}
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);

      // get the underlying doc
      BlogPost.collection.findOne({_id: post._id}, function(err, doc) {
        assert.ifError(err);

        var up = new BlogPost;
        up.init(doc);
        assert.equal(up.comments.length, 1);
        assert.equal(up.comments[0].body, 'worked great');
        assert.strictEqual(true, !!doc.comments[0]._id);
        assert.equal(up.meta.visitors.valueOf(), 2);
        assert.equal(up.mixed.x, 'ECKS');
        assert.deepEqual(up.numbers.toObject(), [5, 100]);
        assert.strictEqual(up.numbers[1].valueOf(), 100);

        assert.equal(doc.idontexist, 2);
        assert.equal(doc.numbers[1], 100);

        db.close(done);
      });
    });
  });

  it('handles $pushAll array of docs', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var update = {
      $pushAll: {comments: [{body: 'i am number 2'}, {body: 'i am number 3'}]}
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.comments.length, 3);
        assert.equal(ret.comments[1].body, 'i am number 2');
        assert.strictEqual(true, !!ret.comments[1]._id);
        assert.ok(ret.comments[1]._id instanceof DocumentObjectId);
        assert.equal(ret.comments[2].body, 'i am number 3');
        assert.strictEqual(true, !!ret.comments[2]._id);
        assert.ok(ret.comments[2]._id instanceof DocumentObjectId);
        db.close(done);
      });
    });
  });

  it('handles $pull of object literal array of docs (gh-542)', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var update = {
      $pull: {comments: {body: 'i am number 2'}}
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.comments.length, 2);
        assert.equal(ret.comments[0].body, 'worked great');
        assert.ok(ret.comments[0]._id instanceof DocumentObjectId);
        assert.equal(ret.comments[1].body, 'i am number 3');
        assert.ok(ret.comments[1]._id instanceof DocumentObjectId);
        db.close(done);
      });
    });
  });

  it('makes copy of conditions and update options', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var conditions = {'_id': post._id.toString()};
    var update = {'$set': {'some_attrib': post._id.toString()}};
    BlogPost.update(conditions, update, function(err) {
      assert.ifError(err);
      assert.equal(typeof conditions._id, 'string');
      db.close(done);
    });
  });

  it('handles weird casting (gh-479)', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    function a() {
    }

    a.prototype.toString = function() {
      return 'MongoDB++';
    };
    var crazy = new a;

    var update = {
      $addToSet: {'comments.$.comments': {body: 'The Ring Of Power'}},
      $set: {'comments.$.title': crazy}
    };

    BlogPost.update({_id: post._id, 'comments.body': 'worked great'}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.comments.length, 2);
        assert.equal(ret.comments[0].body, 'worked great');
        assert.equal(ret.comments[0].title, 'MongoDB++');
        assert.strictEqual(true, !!ret.comments[0].comments);
        assert.equal(ret.comments[0].comments.length, 1);
        assert.strictEqual(ret.comments[0].comments[0].body, 'The Ring Of Power');
        assert.ok(ret.comments[0]._id instanceof DocumentObjectId);
        assert.ok(ret.comments[0].comments[0]._id instanceof DocumentObjectId);
        assert.equal(ret.comments[1].body, 'i am number 3');
        assert.strictEqual(undefined, ret.comments[1].title);
        assert.ok(ret.comments[1]._id instanceof DocumentObjectId);
        db.close(done);
      });
    });
  });

  var last;
  it('handles date casting (gh-479)', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var update = {
      $inc: {'comments.$.newprop': '1'},
      $set: {date: (new Date).getTime()} // check for single val casting
    };

    BlogPost.update({_id: post._id, 'comments.body': 'worked great'}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret._doc.comments[0]._doc.newprop, 1);
        assert.strictEqual(undefined, ret._doc.comments[1]._doc.newprop);
        assert.ok(ret.date instanceof Date);
        assert.equal(ret.date.toString(), new Date(update.$set.date).toString());

        last = ret;
        db.close(done);
      });
    });
  });

  it('handles $addToSet (gh-545)', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var owner = last.owners[0];

    var update = {
      $addToSet: {owners: owner}
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.owners.length, 1);
        assert.equal(ret.owners[0].toString(), owner.toString());

        last = ret;
        db.close(done);
      });
    });
  });

  it('handles $addToSet with $each (gh-545)', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var owner = last.owners[0],
        newowner = new DocumentObjectId;

    var update = {
      $addToSet: {owners: {$each: [owner, newowner]}}
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.owners.length, 2);
        assert.equal(ret.owners[0].toString(), owner.toString());
        assert.equal(ret.owners[1].toString(), newowner.toString());

        last = newowner;
        db.close(done);
      });
    });
  });

  it('handles $pop and $unset (gh-574)', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var update = {
      $pop: {owners: -1},
      $unset: {title: 1}
    };


    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.owners.length, 1);
        assert.equal(ret.owners[0].toString(), last.toString());
        assert.strictEqual(undefined, ret.title);
        db.close(done);
      });
    });
  });

  it('works with nested positional notation', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    var update = {
      $set: {
        'comments.0.comments.0.date': '11/5/2011',
        'comments.1.body': 9000
      }
    };

    BlogPost.update({_id: post._id}, update, function(err) {
      assert.ifError(err);
      BlogPost.findById(post, function(err, ret) {
        assert.ifError(err);
        assert.equal(ret.comments.length, 2, 2);
        assert.equal(ret.comments[0].body, 'worked great');
        assert.equal(ret.comments[1].body, '9000');
        assert.equal(ret.comments[0].comments[0].date.toString(), new Date('11/5/2011').toString());
        assert.equal(ret.comments[1].comments.length, 0);
        db.close(done);
      });
    });
  });

  it('handles $pull with obj literal (gh-542)', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    BlogPost.findById(post, function(err, last) {
      assert.ifError(err);

      var update = {
        $pull: {comments: {_id: last.comments[0].id}}
      };

      BlogPost.update({_id: post._id}, update, function(err) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.comments.length, 1);
          assert.equal(ret.comments[0].body, '9000');
          db.close(done);
        });
      });
    });
  });

  it('handles $pull of obj literal and nested $in', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    BlogPost.findById(post, function(err, last) {
      assert.ifError(err);
      var update = {
        $pull: {comments: {body: {$in: [last.comments[0].body]}}}
      };

      BlogPost.update({_id: post._id}, update, function(err) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.comments.length, 0);

          last = ret;
          db.close(done);
        });
      });
    });
  });

  it('handles $pull and nested $nin', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection);

    BlogPost.findById(post, function(err, last) {
      assert.ifError(err);

      last.comments.push({body: 'hi'}, {body: 'there'});
      last.save(function(err) {
        assert.ifError(err);
        BlogPost.findById(post, function(err, ret) {
          assert.ifError(err);
          assert.equal(ret.comments.length, 2);

          var update = {
            $pull: {comments: {body: {$nin: ['there']}}}
          };

          BlogPost.update({_id: ret._id}, update, function(err) {
            assert.ifError(err);
            BlogPost.findById(post, function(err, ret) {
              assert.ifError(err);
              assert.equal(ret.comments.length, 1);
              db.close(done);
            });
          });
        });
      });
    });
  });

  it('updates numbers atomically', function(done) {
    var db = start(),
        BlogPost = db.model('BlogPostForUpdates', collection),
        totalDocs = 4;

    var post = new BlogPost;
    post.set('meta.visitors', 5);

    function complete() {
      BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
        db.close();
        assert.ifError(err);
        assert.equal(doc.get('meta.visitors'), 9);
        done();
      });
    }

    post.save(function(err) {
      assert.ifError(err);
      function callback(err) {
        assert.ifError(err);
        --totalDocs || complete();
      }
      for (var i = 0; i < 4; ++i) {
        BlogPost
        .update({_id: post._id}, {$inc: {'meta.visitors': 1}}, callback);
      }
    });
  });

  describe('honors strict schemas', function() {
    it('(gh-699)', function(done) {
      var db = start();
      var S = db.model('UpdateStrictSchema');

      var doc = S.find()._castUpdate({ignore: true});
      assert.equal(doc, false);
      doc = S.find()._castUpdate({$unset: {x: 1}});
      assert.equal(Object.keys(doc.$unset).length, 1);
      db.close(done);
    });

    it('works', function(done) {
      var db = start();
      var S = db.model('UpdateStrictSchema');
      var s = new S({name: 'orange crush'});

      s.save(function(err) {
        assert.ifError(err);

        S.update({_id: s._id}, {ignore: true}, function(err, affected) {
          assert.ifError(err);
          assert.equal(affected.n, 0);

          S.findById(s._id, function(err, doc) {
            assert.ifError(err);
            assert.ok(!doc.ignore);
            assert.ok(!doc._doc.ignore);

            S.update({_id: s._id}, {name: 'Drukqs', foo: 'fooey'}, function(err, affected) {
              assert.ifError(err);
              assert.equal(affected.n, 1);

              S.findById(s._id, function(err, doc) {
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

  it('passes number of affected docs', function(done) {
    var db = start(),
        B = db.model('BlogPostForUpdates', 'wwwwowowo' + random());

    B.create({title: 'one'}, {title: 'two'}, {title: 'three'}, function(err) {
      assert.ifError(err);
      B.update({}, {title: 'newtitle'}, {multi: true}, function(err, affected) {
        db.close();
        assert.ifError(err);
        assert.equal(affected.n, 3);
        done();
      });
    });
  });

  it('updates a number to null (gh-640)', function(done) {
    var db = start();
    var B = db.model('BlogPostForUpdates', 'wwwwowowo' + random());
    var b = new B({meta: {visitors: null}});
    b.save(function(err) {
      assert.ifError(err);
      B.findById(b, function(err, b) {
        assert.ifError(err);
        assert.strictEqual(b.meta.visitors, null);

        B.update({_id: b._id}, {meta: {visitors: null}}, function(err) {
          db.close();
          assert.strictEqual(null, err);
          done();
        });
      });
    });
  });

  it('handles $pull from Mixed arrays (gh-735)', function(done) {
    var db = start();
    var schema = new Schema({comments: []});
    var M = db.model('gh-735', schema, 'gh-735_' + random());
    M.create({comments: [{name: 'node 0.8'}]}, function(err, doc) {
      assert.ifError(err);
      M.update({_id: doc._id}, {$pull: {comments: {name: 'node 0.8'}}}, function(err, affected) {
        assert.ifError(err);
        assert.equal(affected.n, 1);
        db.close();
        done();
      });
    });
  });

  it('handles $push with $ positionals (gh-1057)', function(done) {
    var db = start();

    var taskSchema = new Schema({
      name: String
    });

    var componentSchema = new Schema({
      name: String,
      tasks: [taskSchema]
    });

    var projectSchema = new Schema({
      name: String,
      components: [componentSchema]
    });

    var Project = db.model('1057-project', projectSchema, '1057-' + random());

    Project.create({name: 'my project'}, function(err, project) {
      assert.ifError(err);
      var pid = project.id;
      var comp = project.components.create({name: 'component'});
      Project.update({_id: pid}, {$push: {components: comp}}, function(err) {
        assert.ifError(err);
        var task = comp.tasks.create({name: 'my task'});
        Project.update({_id: pid, 'components._id': comp._id}, {$push: {'components.$.tasks': task}}, function(err) {
          assert.ifError(err);
          Project.findById(pid, function(err, proj) {
            assert.ifError(err);
            assert.ok(proj);
            assert.equal(proj.components.length, 1);
            assert.equal(proj.components[0].name, 'component');
            assert.equal(comp.id, proj.components[0].id);
            assert.equal(proj.components[0].tasks.length, 1);
            assert.equal(proj.components[0].tasks[0].name, 'my task');
            assert.equal(task.id, proj.components[0].tasks[0].id);
            db.close(done);
          });
        });
      });
    });
  });

  it('handles nested paths starting with numbers (gh-1062)', function(done) {
    var db = start();
    var schema = new Schema({counts: Schema.Types.Mixed});
    var M = db.model('gh-1062', schema, '1062-' + random());
    M.create({counts: {}}, function(err, m) {
      assert.ifError(err);
      M.update({}, {$inc: {'counts.1': 1, 'counts.1a': 10}}, function(err) {
        assert.ifError(err);
        M.findById(m, function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.counts['1'], 1);
          assert.equal(doc.counts['1a'], 10);
          db.close(done);
        });
      });
    });
  });

  it('handles positional operators with referenced docs (gh-1572)', function(done) {
    var db = start();

    var so = new Schema({title: String, obj: [String]});
    var Some = db.model('Some' + random(), so);

    Some.create({obj: ['a', 'b', 'c']}, function(err, s) {
      assert.ifError(err);

      Some.update({_id: s._id, obj: 'b'}, {$set: {'obj.$': 2}}, function(err) {
        assert.ifError(err);

        Some.findById(s._id, function(err, ss) {
          assert.ifError(err);

          assert.strictEqual(ss.obj[1], '2');
          db.close(done);
        });
      });
    });
  });

  it('use .where for update condition (gh-2170)', function(done) {
    var db = start();
    var so = new Schema({num: Number});
    var Some = db.model('gh-2170' + random(), so);

    Some.create([{num: 1}, {num: 1}], function(err, docs) {
      assert.ifError(err);
      assert.equal(docs.length, 2);
      var doc0 = docs[0];
      var doc1 = docs[1];
      var sId0 = doc0._id;
      var sId1 = doc1._id;
      Some.where({_id: sId0}).update({}, {$set: {num: '99'}}, {multi: true}, function(err, cnt) {
        assert.ifError(err);
        assert.equal(cnt.n, 1);
        Some.findById(sId0, function(err, doc0_1) {
          assert.ifError(err);
          assert.equal(doc0_1.num, 99);
          Some.findById(sId1, function(err, doc1_1) {
            assert.ifError(err);
            assert.equal(doc1_1.num, 1);
            db.close(done);
          });
        });
      });
    });
  });

  describe('mongodb 2.4 features', function() {
    var mongo24_or_greater = false;

    before(function(done) {
      start.mongodVersion(function(err, version) {
        assert.ifError(err);
        mongo24_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 4);
        done();
      });
    });

    it('$setOnInsert operator', function(done) {
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 $setOnInsert feature');
        return done();
      }

      var db = start();
      var schema = new Schema({name: String, age: Number, x: String});
      var M = db.model('setoninsert-' + random(), schema);

      var match = {name: 'set on insert'};
      var op = {$setOnInsert: {age: '47'}, x: 'inserted'};
      M.update(match, op, {upsert: true}, function(err) {
        assert.ifError(err);
        M.findOne(function(err, doc) {
          assert.ifError(err);
          assert.equal(doc.age, 47);
          assert.equal(doc.name, 'set on insert');

          var match = {name: 'set on insert'};
          var op = {$setOnInsert: {age: 108}, name: 'changed'};
          M.update(match, op, {upsert: true}, function(err) {
            assert.ifError(err);

            M.findOne(function(err, doc) {
              assert.equal(doc.age, 47);
              assert.equal(doc.name, 'changed');
              db.close(done);
            });
          });
        });
      });
    });

    it('push with $slice', function(done) {
      if (!mongo24_or_greater) {
        console.log('not testing mongodb 2.4 $push with $slice feature');
        return done();
      }

      var db = start();
      var schema = new Schema({name: String, n: [{x: Number}]});
      var M = db.model('setoninsert-' + random(), schema);

      M.create({name: '2.4'}, function(err, created) {
        assert.ifError(err);

        var op = {
          $push: {
            n: {
              $each: [{x: 10}, {x: 4}, {x: 1}],
              $slice: '-1',
              $sort: {x: 1}
            }
          }
        };

        M.update({_id: created._id}, op, function(err) {
          assert.ifError(err);
          M.findById(created._id, function(err, doc) {
            assert.ifError(err);
            assert.equal(created.id, doc.id);
            assert.equal(doc.n.length, 1);
            assert.equal(doc.n[0].x, 10);

            op = {
              $push: {
                n: {
                  $each: [],
                  $slice: 0
                }
              }
            };
            M.update({_id: created._id}, op, function(err) {
              assert.ifError(err);
              M.findById(created._id, function(error, doc) {
                assert.ifError(error);
                assert.equal(doc.n.length, 0);
                db.close(done);
              });
            });
          });
        });
      });
    });
  });

  describe('mongodb 2.6 features', function() {
    var mongo26_or_greater = false;

    before(function(done) {
      start.mongodVersion(function(err, version) {
        assert.ifError(err);
        mongo26_or_greater = version[0] > 2 || (version[0] === 2 && version[1] >= 6);
        done();
      });
    });

    it('supports $position', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      var db = start();
      var schema = new Schema({name: String, n: [{x: Number}]});
      var M = db.model('setoninsert-' + random(), schema);

      var m = new M({name: '2.6', n: [{x: 0}]});
      m.save(function(error, m) {
        assert.ifError(error);
        assert.equal(m.n.length, 1);
        M.update(
            {name: '2.6'},
            {$push: {n: {$each: [{x: 2}, {x: 1}], $position: 0}}},
            function(error) {
              assert.ifError(error);
              M.findOne({name: '2.6'}, function(error, m) {
                assert.ifError(error);
                assert.equal(m.n.length, 3);
                assert.equal(m.n[0].x, 2);
                assert.equal(m.n[1].x, 1);
                assert.equal(m.n[2].x, 0);
                db.close(done);
              });
            });
      });
    });

    it('supports $currentDate', function(done) {
      if (!mongo26_or_greater) {
        return done();
      }

      var db = start();
      var schema = new Schema({name: String, lastModified: Date, lastModifiedTS: Date});
      var M = db.model('gh-2019', schema);

      var m = new M({name: '2.6'});
      m.save(function(error) {
        assert.ifError(error);
        var before = Date.now();
        M.update(
            {name: '2.6'},
            {$currentDate: {lastModified: true, lastModifiedTS: {$type: 'timestamp'}}},
            function(error) {
              assert.ifError(error);
              M.findOne({name: '2.6'}, function(error, m) {
                var after = Date.now();
                assert.ifError(error);
                assert.ok(m.lastModified.getTime() >= before);
                assert.ok(m.lastModified.getTime() <= after);
                db.close(done);
              });
            });
      });
    });
  });

  describe('{overwrite: true}', function() {
    it('overwrite works', function(done) {
      var db = start();
      var schema = new Schema({mixed: {}});
      var M = db.model('updatesmixed-' + random(), schema);

      M.create({mixed: 'something'}, function(err, created) {
        assert.ifError(err);

        M.update({_id: created._id}, {mixed: {}}, {overwrite: true}, function(err) {
          assert.ifError(err);
          M.findById(created._id, function(err, doc) {
            assert.ifError(err);
            assert.equal(created.id, doc.id);
            assert.equal(typeof doc.mixed, 'object');
            assert.equal(Object.keys(doc.mixed).length, 0);
            db.close(done);
          });
        });
      });
    });

    it('overwrites all properties', function(done) {
      var db = start();
      var sch = new Schema({title: String, subdoc: {name: String, num: Number}});

      var M = db.model('updateover' + random(), sch);

      M.create({subdoc: {name: 'that', num: 1}}, function(err, doc) {
        assert.ifError(err);

        M.update({_id: doc.id}, {title: 'something!'}, {overwrite: true}, function(err) {
          assert.ifError(err);
          M.findById(doc.id, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.title, 'something!');
            assert.equal(doc.subdoc.name, undefined);
            assert.equal(doc.subdoc.num, undefined);
            db.close(done);
          });
        });
      });
    });

    it('allows users to blow it up', function(done) {
      var db = start();
      var sch = new Schema({title: String, subdoc: {name: String, num: Number}});

      var M = db.model('updateover' + random(), sch);

      M.create({subdoc: {name: 'that', num: 1, title: 'hello'}}, function(err, doc) {
        assert.ifError(err);

        M.update({_id: doc.id}, {}, {overwrite: true}, function(err) {
          assert.ifError(err);
          M.findById(doc.id, function(err, doc) {
            assert.ifError(err);
            assert.equal(doc.title, undefined);
            assert.equal(doc.subdoc.name, undefined);
            assert.equal(doc.subdoc.num, undefined);
            db.close(done);
          });
        });
      });
    });
  });

  it('casts empty arrays', function(done) {
    var db = start();

    var so = new Schema({arr: []});
    var Some = db.model('1838-' + random(), so);

    Some.create({arr: ['a']}, function(err, s) {
      if (err) {
        return done(err);
      }

      Some.update({_id: s._id}, {arr: []}, function(err) {
        if (err) {
          return done(err);
        }
        Some.findById(s._id, function(err, doc) {
          if (err) {
            return done(err);
          }
          assert.ok(Array.isArray(doc.arr));
          assert.strictEqual(0, doc.arr.length);
          db.close(done);
        });
      });
    });
  });

  describe('defaults and validators (gh-860)', function() {
    it('applies defaults on upsert', function(done) {
      var db = start();

      var s = new Schema({topping: {type: String, default: 'bacon'}, base: String});
      var Breakfast = db.model('gh-860-0', s);
      var updateOptions = {upsert: true, setDefaultsOnInsert: true};
      Breakfast.update({}, {base: 'eggs'}, updateOptions, function(error) {
        assert.ifError(error);
        Breakfast.findOne({}).lean().exec(function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'bacon');
          db.close(done);
        });
      });
    });

    it('doesnt set default on upsert if query sets it', function(done) {
      var db = start();

      var s = new Schema({topping: {type: String, default: 'bacon'}, base: String});
      var Breakfast = db.model('gh-860-1', s);

      var updateOptions = {upsert: true, setDefaultsOnInsert: true};
      Breakfast.update({topping: 'sausage'}, {base: 'eggs'}, updateOptions, function(error) {
        assert.ifError(error);
        Breakfast.findOne({}, function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'sausage');
          db.close();
          done();
        });
      });
    });

    it('properly sets default on upsert if query wont set it', function(done) {
      var db = start();

      var s = new Schema({topping: {type: String, default: 'bacon'}, base: String});
      var Breakfast = db.model('gh-860-2', s);

      var updateOptions = {upsert: true, setDefaultsOnInsert: true};
      Breakfast.update({topping: {$ne: 'sausage'}}, {base: 'eggs'}, updateOptions, function(error) {
        assert.ifError(error);
        Breakfast.findOne({}, function(error, breakfast) {
          assert.ifError(error);
          assert.equal(breakfast.base, 'eggs');
          assert.equal(breakfast.topping, 'bacon');
          db.close();
          done();
        });
      });
    });

    it('runs validators if theyre set', function(done) {
      var db = start();

      var s = new Schema({
        topping: {
          type: String,
          validate: function() {
            return false;
          }
        },
        base: {
          type: String,
          validate: function() {
            return true;
          }
        }
      });
      var Breakfast = db.model('gh-860-3', s);

      var updateOptions = {upsert: true, setDefaultsOnInsert: true, runValidators: true};
      Breakfast.update({}, {topping: 'bacon', base: 'eggs'}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 1);
        assert.equal(Object.keys(error.errors)[0], 'topping');
        assert.equal(error.errors.topping.message, 'Validator failed for path `topping` with value `bacon`');

        Breakfast.findOne({}, function(error, breakfast) {
          assert.ifError(error);
          assert.ok(!breakfast);
          db.close();
          done();
        });
      });
    });

    it('validators handle $unset and $setOnInsert', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, required: true},
        eggs: {
          type: String,
          validate: function() {
            assert.ok(this instanceof require('../').Query);
            return false;
          }
        }
      });
      var Breakfast = db.model('gh-860-4', s);

      var updateOptions = {runValidators: true, context: 'query'};
      Breakfast.update({}, {$unset: {steak: ''}, $setOnInsert: {eggs: 'softboiled'}}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 2);
        assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
        assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
        assert.equal(error.errors.eggs.message, 'Validator failed for path `eggs` with value `softboiled`');
        assert.equal(error.errors.steak.message, 'Path `steak` is required.');
        db.close();
        done();
      });
    });

    it('min/max, enum, and regex built-in validators work', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, enum: ['ribeye', 'sirloin']},
        eggs: {type: Number, min: 4, max: 6},
        bacon: {type: String, match: /strips/}
      });
      var Breakfast = db.model('gh-860-5', s);

      var updateOptions = {runValidators: true};
      Breakfast.update({}, {$set: {steak: 'ribeye', eggs: 3, bacon: '3 strips'}}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 1);
        assert.equal(Object.keys(error.errors)[0], 'eggs');
        assert.equal(error.errors.eggs.message, 'Path `eggs` (3) is less than minimum allowed value (4).');

        Breakfast.update({}, {$set: {steak: 'tofu', eggs: 5, bacon: '3 strips'}}, updateOptions, function(error) {
          assert.ok(!!error);
          assert.equal(Object.keys(error.errors).length, 1);
          assert.equal(Object.keys(error.errors)[0], 'steak');
          assert.equal(error.errors.steak, '`tofu` is not a valid enum value for path `steak`.');

          Breakfast.update({}, {$set: {steak: 'sirloin', eggs: 6, bacon: 'none'}}, updateOptions, function(error) {
            assert.ok(!!error);
            assert.equal(Object.keys(error.errors).length, 1);
            assert.equal(Object.keys(error.errors)[0], 'bacon');
            assert.equal(error.errors.bacon.message, 'Path `bacon` is invalid (none).');

            db.close();
            done();
          });
        });
      });
    });

    it('multiple validation errors', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, enum: ['ribeye', 'sirloin']},
        eggs: {type: Number, min: 4, max: 6},
        bacon: {type: String, match: /strips/}
      });
      var Breakfast = db.model('gh-860-6', s);

      var updateOptions = {runValidators: true};
      Breakfast.update({}, {$set: {steak: 'tofu', eggs: 2, bacon: '3 strips'}}, updateOptions, function(error) {
        assert.ok(!!error);
        assert.equal(Object.keys(error.errors).length, 2);
        assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
        assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
        db.close();
        done();
      });
    });

    it('validators ignore $inc', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, required: true},
        eggs: {type: Number, min: 4}
      });
      var Breakfast = db.model('gh-860-7', s);

      var updateOptions = {runValidators: true};
      Breakfast.update({}, {$inc: {eggs: 1}}, updateOptions, function(error) {
        assert.ifError(error);
        db.close();
        done();
      });
    });

    it('validators handle positional operator (gh-3167)', function(done) {
      var db = start();

      var s = new Schema({
        toppings: [{name: {type: String, enum: ['bacon', 'cheese']}}]
      });
      var Breakfast = db.model('gh-860-8', s);

      var updateOptions = {runValidators: true};
      Breakfast.update(
          {'toppings.name': 'bacon'},
          {'toppings.$.name': 'tofu'},
          updateOptions,
          function(error) {
            assert.ok(error);
            assert.ok(error.errors['toppings.0.name']);
            db.close(done);
          });
    });
  });

  it('works with $set and overwrite (gh-2515)', function(done) {
    var db = start();

    var schema = new Schema({breakfast: String});
    var M = db.model('gh-2515', schema);

    M.create({breakfast: 'bacon'}, function(error, doc) {
      assert.ifError(error);
      M.update(
          {_id: doc._id},
          {$set: {breakfast: 'eggs'}},
          {overwrite: true},
          function(error) {
            assert.ifError(error);
            M.findOne({_id: doc._id}, function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.breakfast, 'eggs');
              db.close(done);
            });
          });
    });
  });

  it('successfully casts set with nested mixed objects (gh-2796)', function(done) {
    var db = start();

    var schema = new Schema({breakfast: {}});
    var M = db.model('gh-2796', schema);

    M.create({}, function(error, doc) {
      assert.ifError(error);
      M.update(
          {_id: doc._id},
          {breakfast: {eggs: 2, bacon: 3}},
          function(error, result) {
            assert.ifError(error);
            assert.ok(result.ok);
            assert.equal(result.n, 1);
            M.findOne({_id: doc._id}, function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.breakfast.eggs, 2);
              db.close(done);
            });
          });
    });
  });

  it('handles empty update with promises (gh-2796)', function(done) {
    var db = start();

    var schema = new Schema({eggs: Number});
    var M = db.model('gh-2796', schema);

    M.create({}, function(error, doc) {
      assert.ifError(error);
      M.update(
          {_id: doc._id},
          {notInSchema: 1}).
      exec().
      then(function(data) {
        assert.equal(data.ok, 0);
        assert.equal(data.n, 0);
        db.close(done);
      }).
      onReject(function(error) {
        return done(error);
      });
    });
  });

  describe('middleware', function() {
    it('can specify pre and post hooks', function(done) {
      var db = start();

      var numPres = 0;
      var numPosts = 0;
      var band = new Schema({members: [String]});
      band.pre('update', function(next) {
        ++numPres;
        next();
      });
      band.post('update', function() {
        ++numPosts;
      });
      var Band = db.model('gh-964', band);

      var gnr = new Band({members: ['Axl', 'Slash', 'Izzy', 'Duff', 'Adler']});
      gnr.save(function(error) {
        assert.ifError(error);
        assert.equal(numPres, 0);
        assert.equal(numPosts, 0);
        Band.update(
            {_id: gnr._id},
            {$pull: {members: 'Adler'}},
            function(error) {
              assert.ifError(error);
              assert.equal(numPres, 1);
              assert.equal(numPosts, 1);
              Band.findOne({_id: gnr._id}, function(error, doc) {
                assert.ifError(error);
                assert.deepEqual(['Axl', 'Slash', 'Izzy', 'Duff'],
                    doc.toObject().members);
                db.close(done);
              });
            });
      });
    });

    it('runs before validators (gh-2706)', function(done) {
      var db = start();

      var bandSchema = new Schema({
        lead: {type: String, enum: ['Axl Rose']}
      });
      bandSchema.pre('update', function() {
        this.options.runValidators = true;
      });
      var Band = db.model('gh2706', bandSchema, 'gh2706');

      Band.update({}, {$set: {lead: 'Not Axl'}}, function(err) {
        assert.ok(err);
        db.close(done);
      });
    });

    describe('objects and arrays', function() {
      var db;

      before(function() {
        db = start();
      });

      after(function(done) {
        db.close(done);
      });

      it('embedded objects (gh-2706)', function(done) {
        var bandSchema = new Schema({
          singer: {
            firstName: {type: String, enum: ['Axl']},
            lastName: {type: String, enum: ['Rose']}
          }
        });
        bandSchema.pre('update', function() {
          this.options.runValidators = true;
        });
        var Band = db.model('gh2706', bandSchema, 'gh2706');

        Band.update({}, {$set: {singer: {firstName: 'Not', lastName: 'Axl'}}}, function(err) {
          assert.ok(err);
          done();
        });
      });

      it('handles document array validation (gh-2733)', function(done) {
        var member = new Schema({
          name: String,
          role: {type: String, required: true, enum: ['singer', 'guitar', 'drums', 'bass']}
        });
        var band = new Schema({members: [member], name: String});
        var Band = db.model('band', band, 'bands');
        var members = [
          {name: 'Axl Rose', role: 'singer'},
          {name: 'Slash', role: 'guitar'},
          {name: 'Christopher Walken', role: 'cowbell'}
        ];

        Band.findOneAndUpdate(
            {name: 'Guns N\' Roses'},
            {$set: {members: members}},
            {runValidators: true},
            function(err) {
              assert.ok(err);
              done();
            });
      });

      it('validators on arrays (gh-3724)', function(done) {
        var schema = new Schema({
          arr: [String]
        });

        schema.path('arr').validate(function() {
          return false;
        });

        var M = db.model('gh3724', schema);
        var options = {runValidators: true};
        M.findOneAndUpdate({}, {arr: ['test']}, options, function(error) {
          assert.ok(error);
          assert.ok(/ValidationError/.test(error.toString()));
          done();
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

    Book.update({}, jsonObject, {upsert: true, overwrite: true},
        function(error) {
          assert.ifError(error);
          Book.findOne({id: 0}, function(error, book) {
            assert.ifError(error);
            assert.equal(book.chapters.length, 2);
            assert.ok(book.chapters[0]._id);
            assert.ok(book.chapters[1]._id);
            db.close(done);
          });
        });
  });

  it('works with undefined date (gh-2833)', function(done) {
    var db = start();

    var dateSchema = {
      d: Date
    };
    var D = db.model('gh2833', dateSchema);

    assert.doesNotThrow(function() {
      D.update({}, {d: undefined}, function() {
        db.close(done);
      });
    });
  });

  it('does not add virtuals to update (gh-2046)', function(done) {
    var db = start();

    var childSchema = new Schema({foo: String}, {toObject: {getters: true}});
    var parentSchema = new Schema({children: [childSchema]});

    childSchema.virtual('bar').get(function() {
      return 'bar';
    });

    var Parent = db.model('gh2046', parentSchema, 'gh2046');

    var update = Parent.update({}, {$push: {children: {foo: 'foo'}}}, {upsert: true});
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

  it('doesnt modify original argument doc (gh-3008)', function(done) {
    var db = start();
    var FooSchema = new mongoose.Schema({
      key: Number,
      value: String
    });
    var Model = db.model('gh3008', FooSchema);

    var update = {$set: {values: 2, value: 2}};
    Model.update({key: 1}, update, function() {
      assert.equal(update.$set.values, 2);
      db.close(done);
    });
  });

  describe('bug fixes', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('can $rename (gh-1845)', function(done) {
      var db = start();

      var schema = new Schema({ foo: Date, bar: Date });
      var Model = db.model('gh1845', schema, 'gh1845');

      var update = { $rename: { foo: 'bar'} };
      Model.create({ foo: Date.now() }, function(error) {
        assert.ifError(error);
        Model.update({}, update, { multi: true }, function(error, res) {
          assert.ifError(error);
          assert.ok(res.ok);
          assert.equal(res.nModified, 1);
          db.close(done);
        });
      });
    });

    it('allows objects with positional operator (gh-3185)', function(done) {
      var schema = new Schema({children: [{_id: Number}]});
      var MyModel = db.model('gh3185', schema, 'gh3185');

      MyModel.create({children: [{_id: 1}]}, function(error, doc) {
        assert.ifError(error);
        MyModel.findOneAndUpdate(
            {_id: doc._id, 'children._id': 1},
            {$set: {'children.$': {_id: 2}}},
            {new: true},
            function(error, doc) {
              assert.ifError(error);
              assert.equal(doc.children[0]._id, 2);
              done();
            });
      });
    });

    it('mixed type casting (gh-3305)', function(done) {
      var Schema = mongoose.Schema({}, {strict: false});
      var Model = db.model('gh3305', Schema);

      Model.create({}, function(error, m) {
        assert.ifError(error);
        Model.
        update({_id: m._id}, {$push: {myArr: {key: 'Value'}}}).
        exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.n, 1);
          done();
        });
      });
    });

    it('mixed nested type casting (gh-3337)', function(done) {
      var Schema = mongoose.Schema({attributes: {}}, {strict: true});
      var Model = db.model('gh3337', Schema);

      Model.create({}, function(error, m) {
        assert.ifError(error);
        var update = {$push: {'attributes.scores.bar': {a: 1}}};
        Model.
        update({_id: m._id}, update).
        exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.n, 1);
          Model.findById(m._id, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.attributes.scores.bar.length, 1);
            done();
          });
        });
      });
    });

    it('with single nested (gh-3820)', function(done) {
      var child = new mongoose.Schema({
        item2: {
          item3: String,
          item4: String
        }
      });

      var parentSchema = new mongoose.Schema({
        name: String,
        item1: child
      });

      var Parent = db.model('Parent', parentSchema);

      Parent.create({ name: 'test' }, function(error, doc) {
        assert.ifError(error);
        var update = { 'item1.item2': { item3: 'test1', item4: 'test2' } };
        doc.update(update, function(error) {
          assert.ifError(error);
          Parent.findOne({ _id: doc._id }, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.item1.item2.item3, 'test1');
            assert.equal(doc.item1.item2.item4, 'test2');
            done();
          });
        });
      });
    });

    it('works with buffers (gh-3496)', function(done) {
      var Schema = mongoose.Schema({myBufferField: Buffer});
      var Model = db.model('gh3496', Schema);

      Model.update({}, {myBufferField: new Buffer(1)}, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('dontThrowCastError option (gh-3512)', function(done) {
      var Schema = mongoose.Schema({name: String});
      var Model = db.model('gh3412', Schema);

      var badQuery = {_id: 'foo'};
      var update = {name: 'test'};
      var options = {dontThrowCastError: true};
      Model.update(badQuery, update, options).then(null, function(error) {
        assert.ok(error);
        done();
      });
    });

    it('.update(doc) (gh-3221)', function(done) {
      var Schema = mongoose.Schema({name: String});
      var Model = db.model('gh3221', Schema);

      var query = Model.update({name: 'Val'});
      assert.equal(query.getUpdate().$set.name, 'Val');

      query = Model.find().update({name: 'Val'});
      assert.equal(query.getUpdate().$set.name, 'Val');

      done();
    });

    it('nested schemas with strict false (gh-3883)', function(done) {
      var OrderSchema = new mongoose.Schema({
      }, { strict: false, _id: false });

      var SeasonSchema = new mongoose.Schema({
        regions: [OrderSchema]
      }, { useNestedStrict: true });

      var Season = db.model('gh3883', SeasonSchema);
      var obj = { regions: [{ r: 'test', action: { order: 'hold' } }] };
      Season.create(obj, function(error) {
        assert.ifError(error);
        var query = { 'regions.r': 'test' };
        var update = { $set: { 'regions.$.action': { order: 'move' } } };
        var opts = { 'new': true };
        Season.findOneAndUpdate(query, update, opts, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.toObject().regions[0].action.order, 'move');
          done();
        });
      });
    });

    it('middleware update with exec (gh-3549)', function(done) {
      var Schema = mongoose.Schema({name: String});

      Schema.pre('update', function(next) {
        this.update({name: 'Val'});
        next();
      });

      var Model = db.model('gh3549', Schema);

      Model.create({}, function(error, doc) {
        assert.ifError(error);
        Model.update({_id: doc._id}, {name: 'test'}).exec(function(error) {
          assert.ifError(error);
          Model.findOne({_id: doc._id}, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.name, 'Val');
            done();
          });
        });
      });
    });

    it('casting $push with overwrite (gh-3564)', function(done) {
      var schema = mongoose.Schema({
        topicId: Number,
        name: String,
        followers: [Number]
      });

      var doc = {
        topicId: 100,
        name: 'name',
        followers: [500]
      };

      var M = db.model('gh-3564', schema);

      M.create(doc, function(err) {
        assert.ifError(err);

        var update = {$push: {followers: 200}};
        var opts = {overwrite: true, new: true, safe: true, upsert: false, multi: false};

        M.update({topicId: doc.topicId}, update, opts, function(err) {
          assert.ifError(err);
          M.findOne({topicId: doc.topicId}, function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.name, 'name');
            assert.deepEqual(doc.followers.toObject(), [500, 200]);
            done();
          });
        });
      });
    });

    it('$push with buffer doesnt throw error (gh-3890)', function(done) {
      var InfoSchema = new Schema({
        prop: { type: Buffer }
      });

      var ModelASchema = new Schema({
        infoList: { type: [InfoSchema] }
      });

      var ModelA = db.model('gh3890', ModelASchema);

      var propValue = new Buffer('aa267824dc1796f265ab47870e279780', 'base64');

      var update = {
        $push: {
          info_list: { prop: propValue }
        }
      };

      ModelA.update({}, update, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('$set with buffer (gh-3961)', function(done) {
      var schema = {
        name: Buffer
      };

      var Model = db.model('gh3961', schema);

      var value = new Buffer('aa267824dc1796f265ab47870e279780', 'base64');
      var instance = new Model({ name: null });

      instance.save(function(error) {
        assert.ifError(error);
        var query = { _id: instance._id };
        var update = { $set: { name: value } };
        var ok = function() {
          done();
        };
        Model.update(query, update).then(ok, done);
      });
    });

    it('versioning with setDefaultsOnInsert (gh-2593)', function(done) {
      var schema = new Schema({
        num: Number,
        arr: [{ num: Number }]
      });

      var Model = db.model('gh2593', schema);
      var update = { $inc: { num: 1 }, $push: { arr: { num: 5 } } };
      var options = {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
        runValidators: true
      };
      Model.update({}, update, options, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('update validators on single nested (gh-4332)', function(done) {
      var AreaSchema = new Schema({
        a: String
      });

      var CompanySchema = new Schema({
        area: {
          type: AreaSchema,
          validate: {
            validator: function() {
              return false;
            },
            message: 'Not valid Area'
          }
        }
      });

      var Company = mongoose.model('Company', CompanySchema);

      var update = {
        area: {
          a: 'Helo'
        }
      };

      var opts = {
        runValidators: true
      };

      Company.update({}, update, opts, function(error) {
        assert.ok(error);
        assert.equal(error.errors['area'].message, 'Not valid Area');
        done();
      });
    });

    it('updates child schema timestamps with $push (gh-4049)', function(done) {
      var opts = {
        timestamps: true,
        toObject: {
          virtuals: true
        },
        toJSON: {
          virtuals: true
        }
      };

      var childSchema = new mongoose.Schema({
        senderId: { type: String }
      }, opts);

      var parentSchema = new mongoose.Schema({
        children: [childSchema]
      }, opts);

      var Parent = db.model('gh4049', parentSchema);

      var b2 = new Parent();
      b2.save(function(err, doc) {
        var query = { _id: doc._id };
        var update = { $push: { children: { senderId: '234' } } };
        var opts = { 'new': true };
        Parent.findOneAndUpdate(query, update, opts).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.children.length, 1);
          assert.equal(res.children[0].senderId, '234');
          assert.ok(res.children[0].createdAt);
          assert.ok(res.children[0].updatedAt);
          done();
        });
      });
    });

    it('updates child schema timestamps with $set (gh-4049)', function(done) {
      var opts = {
        timestamps: true,
        toObject: {
          virtuals: true
        },
        toJSON: {
          virtuals: true
        }
      };

      var childSchema = new mongoose.Schema({
        senderId: { type: String }
      }, opts);

      var parentSchema = new mongoose.Schema({
        children: [childSchema],
        child: childSchema
      }, opts);

      var Parent = db.model('gh4049_0', parentSchema);

      var b2 = new Parent();
      b2.save(function(err, doc) {
        var query = { _id: doc._id };
        var update = {
          $set: {
            children: [{ senderId: '234' }],
            child: { senderId: '567' }
          }
        };
        var opts = { 'new': true };
        Parent.findOneAndUpdate(query, update, opts).exec(function(error, res) {
          assert.ifError(error);
          assert.equal(res.children.length, 1);
          assert.equal(res.children[0].senderId, '234');
          assert.ok(res.children[0].createdAt);
          assert.ok(res.children[0].updatedAt);

          assert.ok(res.child.createdAt);
          assert.ok(res.child.updatedAt);
          done();
        });
      });
    });

    it('handles positional operator with timestamps (gh-4418)', function(done) {
      var schema = new Schema({
        thing: [{
          thing2: { type: String },
          test: String
        }]
      }, { timestamps: true });

      var Model = db.model('gh4418', schema);
      var query = { 'thing.thing2': 'test' };
      var update = { $set: { 'thing.$.test': 'test' } };
      Model.update(query, update, function(error) {
        assert.ifError(error);
        done();
      });
    });

    it('update handles casting with mongoose-long (gh-4283)', function(done) {
      require('mongoose-long')(mongoose);

      var Model = db.model('gh4283', {
        number: { type: mongoose.Types.Long }
      });

      Model.create({ number: mongoose.mongo.Long.fromString('0') }, function(error) {
        assert.ifError(error);
        Model.update({}, { $inc: { number: mongoose.mongo.Long.fromString('2147483648') } }, function(error) {
          assert.ifError(error);
          Model.findOne({ number: { $type: 18 } }, function(error, doc) {
            assert.ifError(error);
            assert.ok(doc);
            done();
          });
        });
      });
    });

    it('single nested with runValidators (gh-4420)', function(done) {
      var FileSchema = new Schema({
        name: String
      });

      var CompanySchema = new Schema({
        name: String,
        file: FileSchema
      });

      var Company = db.model('Company', CompanySchema);

      Company.create({ name: 'Booster Fuels' }, function(error) {
        assert.ifError(error);
        var update = { file: { name: 'new-name' } };
        var options = { runValidators: true };
        Company.update({}, update, options, function(error) {
          assert.ifError(error);
          done();
        });
      });
    });
  });
});
