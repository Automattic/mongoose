Virtual attributes
====================

Mongoose supports virtual attributes. Virtual attributes are attributes
that are convenient to have around but that do not get persisted to mongodb.

An example is helpful.

## Example
Take the following schema:

    var PersonSchema = new Schema({
        name: {
            first: String
          , last: String
        }
    });

    var Person = mongoose.model('Person', PersonSchema);

    var theSituation = new Person({name: { first: 'Michael', last: 'Sorrentino' }});

Suppose you want to write `theSituation`'s full name. You could do so via:
    console.log( theSituation.name.first + ' ' + theSituation.name.last );

It is more convenient to define a virtual attribute, `name.full`, so you can instead write:

    console.log( theSituation.name.full ); 

To do so, you can declare a virtual attribute on the Schema, `Person`:

    PersonSchema.virtual('name.full')
      .get( function () {
        return this.name.first + ' ' + this.name.last;
      });

So when you get `name.full`, via

    theSituation.name.full;

the implementation ends up invoking the getter function

    function () {
      return this.name.first + ' ' + this.name.last;
    }

and returning it.

It would also be nice to be able to set `this.name.first` and `this.name.last` by setting `this.name.full`. For example, it would be nice if we wanted to change theSituation's `name.first` and `name.last` to 'The' and 'Situation' respectively just by invoking:

    theSituation.set('name.full', 'The Situation');

Mongoose allows you to do this, too, via virtual attribute setters. You can define a virtual attribute setter thusly:

    PersonSchema.virtual('name.full')
      .get( function () {
        return this.name.first + ' ' + this.name.last;
      })
      .set( function (setFullNameTo) {
        var split = setFullNameTo.split(' ')
          , firstName = split[0], lastName = split[1];
        this.set('name.first', firstName);
        this.set('name.last', lastName);
      });

Then, when you invoke:

    theSituation.set('name.full', 'The Situation');

and you save the document, then `name.first` and `name.last` will be changed in monbodb, but the mongodb document will not have persisted a `name.full` key or value to the database:

    theSituation.save( function (err) {
      Person.findById(theSituation._id, function (err, found) {
        console.log(found.name.first); // 'The'
        console.log(found.name.last);  // 'Situation'
      });
    });

If you want attributes that you can get and set but that are not themselves persisted to mongodb, virtual attributes is the Mongoose feature for you.
