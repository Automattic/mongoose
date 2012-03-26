Getters and Setters
====================

Getters and setters help you change how you get and set the attributes defined by the keys and values in the underlying raw document.

## Setters

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

## Getters

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


**Important!** Note that getters only works when creating or modifying `Document` instances; it will not be invoked when `Document` instances are not involved like in `Model.update()`.

## Summary

Setters are intended to modify the underlying raw data. Getters are intended to transform (but not modify at the raw data level) the underlying raw data into something that the user expects to see. They are both defined in the `Schema` definition.
