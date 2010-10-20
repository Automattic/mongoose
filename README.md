Mongoose: MongoDB ODM/ORM
=========================

The goal of Mongoose is to provide a simple interface for MongoDB.

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

  npm install mongoose

### Setup

Simply require Mongoose:

    require.paths.unshift('vendor/mongoose/lib');
    var mongoose = require('mongoose');

## How to Use

### Defining a model

Mongoose utilizes chaining for defining models. 

**Chaining allows:**

- nested structure to be easily visible.
- automatically define casting for all properties.
- easy to extend.
 
example:
 
    document = mongoose.define;
  
    User = document('User')
      .oid('_id')
      .object('name', 
        document()
          .string('prefix')
          .string('first')
          .string('last'))
      .number('age')
      .array('friends')
      .array('notifications', 
        document()
          .date('date')
          .string('type')
          .boolean('read'))
          
### Mongoose Model Properties

- **types** (see Types)
- **type helpers**
  - get
  - set
  - validate
  - cast // shortcut to override initial (first) setter.
- **task(name,fn)**
- **pre(name,fn)**
- **post(name,fn)**
- **static(name,fn)**

### Mongoose Types

- **document([model [,collection]])** 
  - *model* defines the name of the model, undefined for sub documents
  - *collection* if defined the collection name used when connecting to Mongo. If not defined mongoose lowercases model and adds 's'.
- **object(name, document)**
- **array(name [,type])**
  - *type* optional. A string of a defined mongoose type, auto-casts all items in array as type. If type is a document creates an array of sub documents.
- **oid(name)** eases handling of Mongos ObjectID type.
- **string(name)**
- **number(name)**
- **boolean(name)**
- **date(name)**
- **virtual(name)** Used for defining properties that are helpers to the model, but aren't a part of the model.
- **plugin(fn)** (see 'Plugins')

### Defining Types

- Types can extend other types. 
- Properties can have multiple getters, setters, validators.
- Getters bubble up.
- Setters bubble down.

example:

    type = mongoose.type;

    type('string')
      .get(function(document,key,type){
        return document[key];
      })
      .set(function(val,document,key,type){
        return (typeof val == 'string') ? val : val+'';
      });
    
    type('email')
      .extend('string')
      .validate('email',function(value,callback){
        return callback( /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value) )
      });

### Tasks

Mongoose adds the concept of tasks (actions) to models. Tasks allows you to run actions before, during and after a task. Mongoose core has three predefined tasks:

- hydrate
- save
- remove

In addition to these tasks, Mongoose allows for custom tasks using the 'task' keyword in the model definition. Tasks have pre and post actions that can be triggered to help with proper flow control of logic and actions on your data.

    .pre('save', function(complete){
      doSomethingAsync(function(){
        complete();
      })
    })
    
- **pre(name, fn)**
  Logic that needs to be executed before a task or method
- **post(name, fn)**
  Logic that needs to be executed after a task or method

### Flow Control

Mongoose adds helpers to make async logic in nodejs easier. It is important to understand the parts of mongoose that are sync and async.

- All getters and setters in mongoose are sync.
- Validators can be sync or async.
- Tasks provide helpers for async logic.

Validators run prior to Tasks. Tasks are deferred until validators return. If any validator fails the task is not performed but the task callback is instantly called with the error parameter set. When validators pass, 'pre' task actions are triggered in parallel once complete with no errors the tasks is executed followed by post task actions.


### Model Introspection

When defining anything other then trivial models with mongoose the structure of the data can easily be lost with chaining of getters,setters,validators etc. Mongoose provides a remedy by allowing for model introspection. 

example:

    document = mongoose.define;

    User = document('User')
      .oid('_id')
      .object('name', 
        document()
          .string('prefix')
          .string('first')
          .string('last'))
      .number('age')
      .array('friends')
      .array('notifications', 
        document()
          .date('date')
          .string('type')
          .boolean('read'));
          
    User
      .virtual('full_name')
        .get(function(){
          return this.name.first + ' ' + this.name.last;
        });
        
    User.age
      .validate('not_minor',function(value,complete){
        complete(value > 17);
      });

### Plugins

plugins are functions that receive a document object and decorate it.

    .plugin(require('plugins/authentication') [, options])
    
    module.exports = function(document, options){

      document
        .string('username')
        .string('password')
        .virtual('password_plain')
        .static('authenticate')
        .task('save', function(complete){
          someAsyncShizzle(function(){
            complete();
          });
        })
        
      //overriding a caster
      
      document.username
        .cast(function(val,key){
          return this.username.toLowerCase();
        })
    
    });

### Embedded Array

Anytime a property is defined with .array() an EmbeddedArray is returned. It looks and acts like a regular array. Mongoose does not support index augmentation. ie. arr.length = 4 or arr[arr.length]. 

#### API

- **push(val)** // atomic by default
- **pull(val)** // atomic by default removes all items that match val
- **pop(atomic)**
- **shift(atomic)**
- **splice()**
- **unshift()**
- **set(array)** used to reset the array with a new array. Useful if running a map or filter

### Error Handling

Mongoose handles errors in specific locations in the flow of data. 

- Setters can't fail. Setters only coerce data.
- Validation can fail
- Tasks can fail

Errors will only be reported when an action (task) is performed.

    user.email = 'invalid.address'; // fails
    user.save(function(err,doc){
      
    });

However, when the user does the following:

    user.email = 'invalid.address'; // fails
    user.email = 'nathan@learnboost.com'; // success and clears out previous error state for key


### Partial Hydration

### Atomic Operations

Mongoose implements a partial save strategy by only updating the dirty keys. Since update is used in save we can make any updates to a document atomic.

- **save(callback [,atomic])** 
  - *atomic* defaults to false

Mongoose also supports some atomic operations when dealing with arrays. (see 'Arrays').

## API

### mongoose

#### Methods
    
- **connect(uri)**
  - *uri*  example: 'mongodb://user:pass@server:port/db' (see: http://www.mongodb.org/display/DOCS/Connections)
  
#### Getters

- **define** returns document function for defining new models/documents.
- **type** returns type function for defining new types.
        
### Model

These are methods and properties that all *model instances* already include:

#### Properties

- **isNew**
    
    Whether the instance exists as a document or the db (*false*), or hasn't been saved down before (*true*)

#### Methods

- **save(fn,atomic)**
    
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


