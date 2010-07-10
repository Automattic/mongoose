Mongoose: MongoDB ODM/ORM
=========================

The goal of Mongoose is to provide a extremely simple interface for MongoDB. 

## Features

- Reduces the burden of dealing with nested callback from async operations.
- Provides a simple yet rich API.
- Ability to model your data with custom interfaces.
- Allows for complex business logic in an async way (see `Promises`).

## Installation

### As a submodule of your project (recommended)

  git submodule add git://github.com/LearnBoost/mongoose.git {path/to/mongoose}
  git submodule update --init --recursive
  
Example paths: `support/mongoose`, `vendor/mongoose`.
  
### Cloning the repository (mainly for making changes to mongoose)
  
  git clone git://github.com/LearnBoost/mongoose.git --recursive
  cd mongoose
  
### With npm

  npm install http://github.com/learnboost/mongoose/tree/0.0.2
  
### With Kiwi

  kiwi install mongoose
  
## How to use

### Setup

Simply require Mongoose:

    require.paths.unshift('vendor/mongoose');
    var mongoose = require('mongoose').Mongoose;

### Defining a model

    mongoose.model('User', {
        
        properties: ['first', 'last', 'age', 'updated_at'],
        
        cast: {
          age: Number,
          'nested.path': String
        },
        
        indexes: ['first'],
        
        setters: {
            first: function(v){
                return this.v.capitalize();
            }
        },
        
        getters: {
            full_name: function(){ 
                return this.first + ' ' + this.last 
            }
        },
        
        methods: {
            save: function(fn){
                this.updated_at = new Date();
                this.__super__(fn);
            }
        },
        
        static: {
            findOldPeople: function(){
                return this.find({age: { '$gt': 70 }});
            }
        }
        
    });
    
### Getting a model

Models are pseudo-classes that depend on an active connection. To connect:

    var db = mongoose.connect('mongodb://localhost/db');
    
To get a model:
    
    var User = db.model('User');
    
To create a new instance (document)

    var u = new User();
    u.name = 'John';
    u.save(function(){
        sys.puts('Saved!');
    });
    
To fetch some stuff

    User.find({ name: 'john' }).all(function(array){
        
    });

### Operating on embedded objects

Embedded objects are hydrated like model instances. Assume a MongoDB document like this stored in a variable `user`

    {
        name: 'John',
        blogposts: [
            {
                title: 'Hi',
                body: 'Hi there'
            }
        ]
    }
    
To add a blogpost:

    user.blogposts.push({ title: 'New post', body: 'The body' });
    user.save();

To remove an existing one:

    user.blogposts[0] = null;
    user.save();

## API

### mongoose

#### Methods
    
- **model(name, definition)**
    
    - *definition* determines how the class will be constructed. It's composed of the following keys. All of them are optional:
        
        - *collection*
        
            Optionally, the MongoDB collection name. Defaults to the model name in lowercase and plural. Does not need to be created in advance.
        
        - *properties*
        
            Defines the properties for how you structure the model.
        
            To define simple keys:
        
                properties: [ 'name', 'last' ]
        
            To define arrays:
        
                properties: [ 'name', {'tags': []} ]
        
            To define nested objects:
            
                properties: [ 'name', {contact: ['email', 'phone', ...]} ]
                
            To define array of embedded objects:
            
              properties: [ 'name', {blogposts: [['title', 'body', ...]]} ]
        
            `_id` is added automatically for all models.
        
        - *getters*
        
            Defines getters (can be nested). If the getter matches an existing property, the existing value will be passed as the first argument.
        
        - *setters*
        
            Defines setters (can be nested). If the setter matches an existing property, the return value will be set.
        
        - *cast*
        
            Defines type casting. By default, all properties beginning with `_` are cast to `ObjectID`. (note: Casting an Array will cast all items in the Array. Currently, Arrays cast when 'save' is called.)
        
        - *indexes*
        
            An array of indexes.
            
            Simple indexes: ['name', 'last']
            
            Compound indexes: [{ name: 1, last: 1 }, ...]
            
            Indexes with options: ['simple', [{ name: 1 }, {unique: true}]]
            
            Notice that the objects that you pass are equivalent to those that you would pass to ensureIndex in MongoDB.
        
        - *methods*
        
            Methods that are added to the prototype of the model, or methods that override existing ones. For example `save` (you can call `__super__` to access the parent)
        
        - *static*
        
            Static methods that are not instance-dependent (eg: `findByAge()`)
        
### Model

These are methods and properties that all *model instances* already include:

#### Properties

- **isNew**
    
    Whether the instance exists as a document or the db (*false*), or hasn't been saved down before (*true*)

#### Methods

Note: if you override any of these by including them in the `methods` object of the model definition, the method is inherited and you can call __super__ to access the parent.

- **save(fn)**
    
    Saves down the document and fires the callback.
    
- **remove(fn)**
    
    Removes the document and fires the callback.
    
### Model (static)

These are the methods that can be accessed statically, and affect the collection as a whole.

- **find(props, subset, hydrate)**

    Returns an instance of QueryWriter

    - *props*
    
        Optional, calls the QueryWriter `where` on each key/value. `find({username: 'john'})` is equivalent to:
            
            model.find().where('username', 'john');
        
    - *subset*
    
        Optional, a subset of fields to retrieve. More information on [MongoDB Docs](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-RetrievingaSubsetofFields)
    
    - *hydrate*
    
        Possible values:
            
            - `true`. Returns a model instance (default)
            - `null`. Returns a plain object that is augmented to match the missing properties defined in the model.
            - `false`. Returns the object as it's retrieved from MongoDB.

            
- **findById(id, fn, hydrate)**
    
    Returns an instance of QueryWriter
    
    - *id*
        
        Document id (hex or string allowed)
        
    - *fn*
    
        Optional callback.  Called on success.
    
    - *hydrate*
    
        Same as above
    
- **update(id, doc, fn)**

    Sets/updates *only* the properties of the passed document for the specified object id 

    - *id*
        
        Document id (hex or string allowed)
        
    - *fn (doc)*
    
        Optional callback.  Called on Success.  Doc paramter will contain the hyrdrated document from the DB after the update.
    
    - *hydrate*
    
        Same as above
        
- **remove(where, fn)**

    Executes the query (and triggers a remove of the matched documents)

    - *where*
        
        Valid where clause.
        
    - *fn*    
    
        Optional callback.  Called on success.

### EmbeddedObject

#### Methods

- **remove**
    
    Marks the embeded object for deletion
    
### QueryWriter

QueryWriter allows you to construct queries with very simple syntax. All its methods return the `QueryWriter` instance, which means they're chainable.

#### Methods

##### Executers

These methods execute the query and return a `QueryPromise`.

- **exec**

    Executes the query.

- **count**

    Executes the query (and triggers a count)

    In addition, for the sake of simplicity, all the promise methods (see "Queueable methods") are mirrored in the QueryWriter and trigger `.exec()`. Then, the following two are equivalent:

        User.find({username: 'john'}).all(fn)
    
    and:
    
        User.find({username: 'john'}).exec().all(fn)

##### Modifiers
    
- **where**
    
- **sort**

- **limit**

- **skip**

- **snapshot**

- **group**

### QueryPromise

A promise is a special object that acts as a `queue` if MongoDB has not resulted the results, and executes the methods you call on it once the results are available.

For example

    User.find({ age: { '$gt': 5 } }).first(function(result){
        // gets first result
    }).last(function(result){
        // gets last result
    });

#### Methods

- **stash(fn)**

    Stashes all the current queued methods, which will be called when `complete` is called. Methods that are queued **after** stash is called will only fire after `complete` is called again.

- **complete(result)**

    Completes the promise. The result parameter is optional. It's either null or an array of documents. (internal use)

##### Queueable Methods

You can call all of these in a row, but the callbacks will only trigger when `complete is called`

- **all(fn)**

    Fires with all the results as an array, or an empty array.

- **get(fn)**

    Synonym to `all`

- **last(fn)**

    Fires with the last document or *null*

- **first(fn)**

    Fires with the first document of the resulset or *null* if no documents are returned

- **one(fn)**

    Synonym to `first`

## Credits

Nathan White &lt;nathan@learnboost.com&gt;

Guillermo Rauch &lt;guillermo@learnboost.com&gt;

## License 

(The MIT License)

Copyright (c) 2010 LearnBoost &lt;dev@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
