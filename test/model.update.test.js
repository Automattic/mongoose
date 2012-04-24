
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
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
  , MongooseNumber = mongoose.Types.Number
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

/**
 * Setup.
 */

var Comments = new Schema();

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
});

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

mongoose.model('BlogPost', BlogPost);

var collection = 'blogposts_' + random();

var strictSchema = new Schema({ name: String, x: { nested: String }}, { strict: true });
mongoose.model('UpdateStrictSchema', strictSchema);

module.exports = {

  'test updating documents': function () {
    var db = start()
      , BlogPost = db.model('BlogPost', collection)
      , title = 'Tobi ' + random()
      , author = 'Brian ' + random()
      , newTitle = 'Woot ' + random()
      , id0 = new DocumentObjectId
      , id1 = new DocumentObjectId

    var post = new BlogPost();
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
      should.strictEqual(err, null);
      BlogPost.findById(post._id, function (err, cf) {
        should.strictEqual(err, null);
        cf.title.should.equal(title);
        cf.author.should.equal(author);
        cf.meta.visitors.valueOf().should.eql(0);
        cf.date.should.eql(post.date);
        cf.published.should.be.true;
        cf.mixed.x.should.equal('ex');
        cf.numbers.toObject().should.eql([4,5,6,7]);
        cf.owners.length.should.equal(2);
        cf.owners[0].toString().should.equal(id0.toString());
        cf.owners[1].toString().should.equal(id1.toString());
        cf.comments.length.should.equal(2);
        cf.comments[0].body.should.eql('been there');
        cf.comments[1].body.should.eql('done that');
        should.exist(cf.comments[0]._id);
        should.exist(cf.comments[1]._id);
        cf.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
        cf.comments[1]._id.should.be.an.instanceof(DocumentObjectId);

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
          should.strictEqual(err, null);

          BlogPost.findById(post._id, function (err, up) {
            should.strictEqual(err, null);
            up.title.should.equal(newTitle);
            up.author.should.equal(author);
            up.meta.visitors.valueOf().should.equal(2);
            up.date.toString().should.equal(update.$set.date.toString());
            up.published.should.eql(false);
            up.mixed.x.should.equal('ECKS');
            up.mixed.y.should.equal('why');
            up.numbers.toObject().should.eql([5,7]);
            up.owners.length.should.equal(1);
            up.owners[0].toString().should.eql(id1.toString());
            up.comments[0].body.should.equal('been there');
            up.comments[1].body.should.equal('8');
            should.exist(up.comments[0]._id);
            should.exist(up.comments[1]._id);
            up.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
            up.comments[1]._id.should.be.an.instanceof(DocumentObjectId);

            var update2 = {
                'comments.body': 'fail'
            }

            BlogPost.update({ _id: post._id }, update2, function (err) {
              should.strictEqual(!!err, true);
              ;/^can't append to array using string field name \[body\]/.test(err.message).should.be.true;
              BlogPost.findById(post, function (err, p) {
                should.strictEqual(null, err);

                var update3 = {
                    $pull: 'fail'
                }

                BlogPost.update({ _id: post._id }, update3, function (err) {
                  should.strictEqual(!!err, true);
                  ;/Invalid atomic update value/.test(err.message).should.be.true;

                  var update4 = {
                      $inc: { idontexist: 1 }
                  }

                  // should not overwrite doc when no valid paths are submitted
                  BlogPost.update({ _id: post._id }, update4, function (err) {
                    should.strictEqual(err, null);

                    BlogPost.findById(post._id, function (err, up) {
                      should.strictEqual(err, null);

                      up.title.should.equal(newTitle);
                      up.author.should.equal(author);
                      up.meta.visitors.valueOf().should.equal(2);
                      up.date.toString().should.equal(update.$set.date.toString());
                      up.published.should.eql(false);
                      up.mixed.x.should.equal('ECKS');
                      up.mixed.y.should.equal('why');
                      up.numbers.toObject().should.eql([5,7]);
                      up.owners.length.should.equal(1);
                      up.owners[0].toString().should.eql(id1.toString());
                      up.comments[0].body.should.equal('been there');
                      up.comments[1].body.should.equal('8');
                      // non-schema data was still stored in mongodb
                      should.strictEqual(1, up._doc.idontexist);

                      update5(post);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });

    function update5 (post) {
      var update = {
          comments: [{ body: 'worked great' }]
        , $set: {'numbers.1': 100}
        , $inc: { idontexist: 1 }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(err, null);

        // get the underlying doc
        BlogPost.collection.findOne({ _id: post._id }, function (err, doc) {
          should.strictEqual(err, null);

          var up = new BlogPost;
          up.init(doc);
          up.comments.length.should.equal(1);
          up.comments[0].body.should.equal('worked great');
          should.strictEqual(true, !! doc.comments[0]._id);
          up.meta.visitors.valueOf().should.equal(2);
          up.mixed.x.should.equal('ECKS');
          up.numbers.toObject().should.eql([5,100]);
          up.numbers[1].valueOf().should.eql(100);

          doc.idontexist.should.equal(2);
          doc.numbers[1].should.eql(100);

          update6(post);
        });
      });
    }

    function update6 (post) {
      var update = {
          $pushAll: { comments: [{ body: 'i am number 2' }, { body: 'i am number 3' }] }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.comments.length.should.equal(3);
          ret.comments[1].body.should.equal('i am number 2');
          should.strictEqual(true, !! ret.comments[1]._id);
          ret.comments[1]._id.should.be.an.instanceof(DocumentObjectId)
          ret.comments[2].body.should.equal('i am number 3');
          should.strictEqual(true, !! ret.comments[2]._id);
          ret.comments[2]._id.should.be.an.instanceof(DocumentObjectId)

          update7(post);
        })
      });
    }

    // gh-542
    function update7 (post) {
      var update = {
          $pull: { comments: { body: 'i am number 2' } }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.comments.length.should.equal(2);
          ret.comments[0].body.should.equal('worked great');
          ret.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
          ret.comments[1].body.should.equal('i am number 3');
          ret.comments[1]._id.should.be.an.instanceof(DocumentObjectId)

          update8(post);
        })
      });
    }

    // gh-479
    function update8 (post) {
      function a () {};
      a.prototype.toString = function () { return 'MongoDB++' }
      var crazy = new a;

      var update = {
          $addToSet: { 'comments.$.comments': { body: 'The Ring Of Power' } }
        , $set: { 'comments.$.title': crazy }
      }

      BlogPost.update({ _id: post._id, 'comments.body': 'worked great' }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.comments.length.should.equal(2);
          ret.comments[0].body.should.equal('worked great');
          ret.comments[0].title.should.equal('MongoDB++');
          should.strictEqual(true, !! ret.comments[0].comments);
          ret.comments[0].comments.length.should.equal(1);
          should.strictEqual(ret.comments[0].comments[0].body, 'The Ring Of Power');
          ret.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
          ret.comments[0].comments[0]._id.should.be.an.instanceof(DocumentObjectId)
          ret.comments[1].body.should.equal('i am number 3');
          should.strictEqual(undefined, ret.comments[1].title);
          ret.comments[1]._id.should.be.an.instanceof(DocumentObjectId)

          update9(post);
        })
      });
    }

    // gh-479
    function update9 (post) {
      var update = {
          $inc: { 'comments.$.newprop': '1' }
        , $set: { date: (new Date).getTime() } // check for single val casting
      }

      BlogPost.update({ _id: post._id, 'comments.body': 'worked great' }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret._doc.comments[0]._doc.newprop.should.equal(1);
          should.strictEqual(undefined, ret._doc.comments[1]._doc.newprop);
          ret.date.should.be.an.instanceof(Date);
          ret.date.toString().should.equal(update.$set.date.toString());

          update10(post, ret);
        })
      });
    }

    // gh-545
    function update10 (post, last) {
      var owner = last.owners[0];

      var update = {
          $addToSet: { 'owners': owner }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.owners.length.should.equal(1);
          ret.owners[0].toString().should.eql(owner.toString());

          update11(post, ret);
        })
      });
    }

    // gh-545
    function update11 (post, last) {
      var owner = last.owners[0]
        , newowner = new DocumentObjectId

      var update = {
          $addToSet: { 'owners': { $each: [owner, newowner] }}
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.owners.length.should.equal(2);
          ret.owners[0].toString().should.eql(owner.toString());
          ret.owners[1].toString().should.eql(newowner.toString());

          update12(post, newowner);
        })
      });
    }

    // gh-574
    function update12 (post, newowner) {
      var update = {
          $pop: { 'owners': -1 }
        , $unset: { title: 1 }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.owners.length.should.equal(1);
          ret.owners[0].toString().should.eql(newowner.toString());
          should.strictEqual(undefined, ret.title);

          update13(post, ret);
        })
      });
    }

    function update13 (post, ret) {
      var update = {
          $set: {
              'comments.0.comments.0.date': '11/5/2011'
            , 'comments.1.body': 9000
          }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.comments.length.should.equal(2);
          ret.comments[0].body.should.equal('worked great');
          ret.comments[1].body.should.equal('9000');
          ret.comments[0].comments[0].date.toString().should.equal(new Date('11/5/2011').toString())
          ret.comments[1].comments.length.should.equal(0);

          update14(post, ret);
        })
      });
    }

    // gh-542
    function update14 (post, ret) {
      var update = {
          $pull: { comments: { _id: ret.comments[0].id } }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.comments.length.should.equal(1);
          ret.comments[0].body.should.equal('9000');
          update15(post, ret);
        })
      });
    }

    function update15 (post, ret) {
      var update = {
          $pull: { comments: { body: { $in: [ret.comments[0].body] }} }
      }

      BlogPost.update({ _id: post._id }, update, function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.comments.length.should.equal(0);
          update16(post, ret);
        })
      });
    }

    function update16 (post, ret) {
      ret.comments.$pushAll([{body: 'hi'}, {body:'there'}]);
      ret.save(function (err) {
        should.strictEqual(null, err);
        BlogPost.findById(post, function (err, ret) {
          should.strictEqual(null, err);
          ret.comments.length.should.equal(2);

          var update = {
              $pull: { comments: { body: { $nin: ['there'] }} }
          }

          BlogPost.update({ _id: ret._id }, update, function (err) {
            should.strictEqual(null, err);
            BlogPost.findById(post, function (err, ret) {
              db.close();
              should.strictEqual(null, err);
              ret.comments.length.should.equal(1);
            })
          });
        })
      });
    }
  },

  // gh-699
  'Model._castUpdate should honor strict schemas': function () {
    var db = start();
    var S = db.model('UpdateStrictSchema');
    db.close();

    var doc = S.find()._castUpdate({ ignore: true });
    should.eql(false, doc)
    var doc = S.find()._castUpdate({ $unset: {x: 1}});
    Object.keys(doc.$unset).length.should.equal(1);
  },

  'Model.update should honor strict schemas': function () {
    var db = start();
    var S = db.model('UpdateStrictSchema');
    var s = new S({ name: 'orange crush' });

    s.save(function (err) {
      should.strictEqual(null, err);

      S.update({ _id: s._id }, { ignore: true }, function (err, affected) {
        should.strictEqual(null, err);
        affected.should.equal(0);

        S.findById(s._id, function (err, doc) {
          db.close();
          should.strictEqual(null, err);
          should.not.exist(doc.ignore);
          should.not.exist(doc._doc.ignore);
        });
      });
    });
  },

  'model.update passes number of affected documents': function () {
    var db = start()
      , B = db.model('BlogPost', 'wwwwowowo'+random())

    B.create({ title: 'one'},{title:'two'},{title:'three'}, function (err) {
      should.strictEqual(null, err);
      B.update({}, { title: 'newtitle' }, { multi: true }, function (err, affected) {
        db.close();
        should.strictEqual(null, err);
        affected.should.equal(3);
      });
    });
  }

}
