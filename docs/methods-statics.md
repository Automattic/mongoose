Methods and Statics
====================

Each `Schema` can define instance and static methods for its model.

## Methods

Methods are easy to define:

    var AnimalSchema = new Schema({
        name: String
      , type: String
    });

    AnimalSchema.methods.findSimilarType = function findSimilarType (cb) {
      return this.find({ type: this.type }, cb);
    };

Now when we have an instance of `Animal` we can call our `findSimilarType` method and
find all animals with a matching `type`.

    var Animal = mongoose.model('Animal', AnimalSchema);
    var dog = new Animal({ name: 'Rover', type: 'dog' });

    dog.findSimilarType(function (err, dogs) {
      if (err) return ...
      dogs.forEach(..);
    })

Note that we return what `.find()` returns in our method. The advantages are two-fold.
First, by passing `cb` into `find` we are making it optional b/c `find` called
without a callback will not run the query. Secondly, `this.find`, `this.where`,
and other Model methods return instances of [Query](/docs/finding-documents.html)
which allow us to further utilize its expressive capabilities.

    dog
    .findSimilarType()
    .where('name': /rover/i)
    .limit(20)
    .run(function (err, rovers) {
      if (err) ...
    })

## Statics

Statics are pretty much the same as methods but allow for defining functions that
exist directly on your Model.

    AnimalSchema.statics.search = function search (name, cb) {
      return this.where('name', new RegExp(name, 'i')).run(cb);
    }

    Animal.search('Rover', function (err) {
      if (err) ...
    })
