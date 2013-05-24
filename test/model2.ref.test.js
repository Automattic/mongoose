
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , DocObjectId = mongoose.Types.ObjectId

/**
 * Setup.
 */

/**
 * User schema.
 */

function validate(field){
  return [ function(v){ 
    console.log("Validation happening! Field %s's length is %s", field, v.length);
    return !v.length || v.length < 25; 
  },"Validation failed for field " + field ]
}


var Two = new Schema( {
   a: { type: String, validate: validate('Two/a') },
    b: {
       a: { type: String, validate: validate('Two/b/a') },
       b: { type: String, validate: validate('Two/b/b') },
    },
 
});

mongoose.model('Two', Two);


var One = new Schema({
  a: { type: String, validate: validate('One/a') },
  b: {
    a: { type: String, validate: validate('One/b/a') },
    b: { type: String, validate: validate('One/b/b') },
  },

  c: {
    a: {
      a: { type: String, validate: validate('One/c/a/a')  },
      b: { type: String, validate: validate('One/c/a/b')  },
      c: { 
        a: { type: String, validate: validate('One/c/a/c/a') } ,
        b: { type: String, validate: validate('One/c/a/c/b') } ,
        c: { type: String, validate: validate('One/c/a/c/c') } ,
        d: { type: Schema.Types.ObjectId, ref: 'Two' },
      },
    },
  },

  d: [ ] , // same as Mixed
  e: { type: Schema.Types.Mixed, validate:validate('One/e')},

  f: [Two],

  f1: {
    a: { type: String, validate: validate('One/c/a/a')},
    b: [Two],
  },

  g: [{ type: String, validate: validate('One/g') }],

  h: { type: Schema.Types.ObjectId, ref: 'Two' },

  i: [{ type: Schema.Types.ObjectId, ref: 'Two' }],

  j: [{
        a: { type: String,  validate: validate('One/g')  },
        b: [Two]
      }],

});

mongoose.model('One', One);

/**
 * Tests.
 */

describe('model: ref:', function(){

  it('Update works with populated arrays (gh-602)', function(done){

/*
    var db = start()
      , BlogPost = db.model('RefBlogPost2', posts)
      , User = db.model('RefUser2', users)

    var user1 = new User({ name: 'aphex' });
    var user2 = new User({ name: 'twin' });
*/

    var db = start();
    var One = db.model('One');
    var Two = db.model('Two');

    One.create({

      a: 'One/a',
      b: {
        a: 'One/b/a',
        b: 'One/b/b',
      },

      c: {
        a: {
          a: 'One/c/a/a',
          b: 'One/c/a/b',
          c: {
            a: 'One/c/a/c/a',
            b: 'One/c/a/c/b',
            c: 'One/c/a/c/c',
            d: {
              a: 'One/c/a/c/c > Two/a [R1]',
              b: {
                a: 'One/c/a/c/c > Two/b/a [R1]',
                b: 'One/c/a/c/c > Two/b/b [R1]',
              },
            }
          },
        },
      },

      d: { m1:'m1', m2:{ m3:'m3', m4:'m4'}},

      e: { m5:'m5', m6:{ m7:'m7', m8:'m8'}},

      f: [

        { a: 'One/f > Two/a [0]',
          b: {
            a: 'One/f > Two/b/a [0]',
            b: 'One/f > Two/b/b [0]',
          },
        },

        { a: 'One/f > Two/a [1]',
          b: {
            a: 'One/f > Two/b/a [1]',
            b: 'One/f > Two/b/b [1]',
            c: {

            }            


          },
        }
      ],

      f1:  {
        a: "One/f1/a > Two/a [2]",
        b: [
         
          { a: 'One/f1/b > Two/a [2]',
            b: {
              a: 'One/f1/b > Two/b/a [2]',
              b: 'One/f1/b > Two/b/b [2]',
              c: {
              }
            }
          }
        ]
      },


      g: ['one', 'two', 'three', 'four' ],

      h: {

        a: 'One/h/a > Two/a [R2]',
        b: {
          a: 'One/h/a/b > Two/b/a [R2]',
          b: 'One/h/a/b > Two/b/b [R2]',
        },
      },

      j:[{ 
        a: 'something',
        b: [{ a: 'One/j/b > Two/a [2]',
              b: {
                a: 'One/j/b > Two/b/a [2]',
                b: 'One/j/b > Two/b/b [2]',
                c: {
                }
             }
           }]
        }],


    }, function(err){
      assert.ifError(err);

      var t = new Two();
      t.a =  "Twoaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/aaaaa";
      t.b =  { a: 'Two/a/aaaaaaa', b: 'Two/a/b' }

      // One.findOneAndUpdate({}, { a:'One/a UPDATEDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD' } , function( err) {
      // One.findOneAndUpdate({}, { $set: { c: { a: { a: 'Test2' } } } }, function( err) {
      // One.findOneAndUpdate({}, { $push: { 'f1.b': t }  }, function( err) {
      One.findOneAndUpdate({}, { $set: { 'f1': { a: "ppppppppppppppppppppppppppppppppppppppppppppp", b: [ t, t, t ]   }  }}, { enableValidation: true }


      //One.findOneAndUpdate({}, { $set: { 'g': [ 'oneeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 'two', 'threeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ] } } 



      /* GOOD #1 */
      /*One.findOneAndUpdate({}, { $push: { 'j': {
        a: 'something',
        b: [
           { a: 'One/j/b > Two/a [2]',
              b: {
                a: 'Oooe/j/b > Two/b/a [2]',
                b: 'OBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBne/j/b > Two/b/b [2]',
                c: {
                }
             }
           },

           { a: 'One/j/b > Two/a [2]',
              b: {
                a: 'AAAAAAAAAAAAAAAAAAAAAAAAAA TOOO/j/b > Two/b/a [2]',
                b: 'One/j/b > Two/b/b [2]',
                c: {
                }
             }
           },
           ]
        }
      }}, { enableValidation: true } 
*/

 , function( err) {


       }  , function( err) {
        assert.ifError(err);

        console.log("OK");

      });

    }); 

/*
    One.create({name:'aphex'},{name:'twin'}, function (err, u1, u2) {
      assert.ifError(err);

      var post = One.create({
          title: 'Woot'
        , fans: []
      }, function (err, post) {
        assert.ifError(err);

        var update = { fans: [u1, u2] };
        BlogPost.update({ _id: post }, update, function (err) {
          assert.ifError(err);

          // the original update doc should not be modified
          assert.ok('fans' in update);
          assert.ok(!('$set' in update));
          assert.ok(update.fans[0] instanceof mongoose.Document);
          assert.ok(update.fans[1] instanceof mongoose.Document);

          BlogPost.findById(post, function (err, post) {
            db.close();
            assert.ifError(err);
            assert.equal(post.fans.length,2);
            assert.ok(post.fans[0] instanceof DocObjectId);
            assert.ok(post.fans[1] instanceof DocObjectId);
            done();
          });
        });
      });
    });
*/

  })
});
