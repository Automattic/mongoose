Methods
=======

Methods can be defined by calling the 'method' method of the schema you wish
to attach it to and passing a JSON object containing the method.

## Adding a method to a model

    AccountSchema.method({
      changeEmail: function(edit_email,callback){
        this.email = edit_email;
        this.save(callback);
      }
    });

You can now call this by doing something like

    // Assuming you've obtained an account document model instance from mongo called a
    a.changeEmail('example@somedomain.com',function(){
      console.log('changed account email');
    });

Statics
=======

Similar to methods, statics can be defined by calling the 'static' method of the schema you wish
to attach it to and passing a JSON object containing the method.  Here because it is a static
you no longer have access to 'this'.

## Adding a static function to the model

    AccountSchema.static({
        hashPassword: function(unhashed_password){
        var salt = '_should_make_this_salt_dynamic';
        var hash = hashlib.sha1(unhashed_password+salt);
        return hash;
      }
    });

You can now call this by doing something like

    // Account is the overall mongoose model not an instance
    var hashed_pw = Account.hashPassword('mypassword'); 

