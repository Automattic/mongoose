Getters and Setters
====================

Getters and setters help you change how you get and set the attributes defined by the keys and values in the underlying raw document.

## Basic Getters and Setters

Once you have a document in hand, you can set and get attributes on it.  

The best way is with the get() and set() calls.  For example:

    u = new User()
    u.set('age', 25);
    u.set('name.first', 'John');
    u.set('name.last', 'Doe');
    
    u.get('age')  // 25
    u.get('name.first')  // John

You may be tempted to use dot noation. For example:
    
    u = new User();
    u.age = 25;

However you'll quickly find that it "doesn't always work". 

Bad Situation #1:  If you use this object `u` in a ejs template 
(for example express.js or railway.js) the attribute `age` is not visible in
the template.

Bad Situation #2: if you try to set some nested attribute.  For example:

    u.name.first = "John"

Mongoose doesn't magically create a name hash that will take any key on request. So you'll just throw an error.




## Enhancing Setters

Setters allow you to transform the mongoose document's data before it gets to the raw mongodb document and is set as a value on an actual key.

Suppose you are implementing user registration for a website. User provide an email and password, which gets saved to mongodb. The email is a string that you will want to normalize to lower case, in order to avoid one email having more than one account -- e.g., otherwise, avenue@q.com can be registered for 2 accounts via avenue@q.com and AvEnUe@Q.CoM.

You can set up email lower case normalization easily via a Mongoose setter. Note in the following snippet that setters (and also getters) are defined in the `Schema`:

    function toLower (v) {
      return v.toLowerCase();
    }

    var UserSchema = new Schema({
      email: { type: String, set: toLower } 
    });

    var User = mongoose.model('User', UserSchema);
    var user = new User({email: 'AVENUE@Q.COM'});

    console.log(user.email); // 'avenue@q.com'


As you can see above, setters allow you to transform the data before it gets to the raw mongodb document and is set as a value on an actual key.

## Enhancing Getters

Getters allow you to transform the representation of the data as it travels from the raw mongodb document to the value that you see.

Suppose you are storing credit card numbers and you want to hide everything except the last 4 digits to the mongoose user.  You can do so by defining a getter in the following way (again, notice that getters are defined in the `Schema`):

    function obfuscate (cc) {
      return '****-****-****-' + cc.slice(cc.length-4, cc.length);
    }

    var AccountSchema = new Schema({
      creditCardNumber: { type: String, get: obfuscate }
    });

    var Account = mongoose.model('Account', AccountSchema);

    Account.findById( someId, function (err, found) {
      console.log(found.creditCardNumber); // '****-****-****-1234'
    });

## Summary

Setters are intended to modify the underlying raw data. Getters are intended to transform (but not modify at the raw data level) the underlying raw data into something that the user expects to see. They are both defined in the `Schema` definition.
