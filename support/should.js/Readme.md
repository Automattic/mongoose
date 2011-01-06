  _should_ is an expressive, test framework agnostic, assertion library for [node](http://nodejs.org). 

_should_ literally extends node's _assert_ module, in fact, it is node's assert module, for example `should.equal(str, 'foo')` will work, just as `assert.equal(str, 'foo')` would, and `should.AssertionError` **is** `asset.AssertionError`, meaning any test framework supporting this constructor will function properly with _should_.

## Example

    var user = {
        name: 'tj'
      , pets: ['tobi', 'loki', 'jane', 'bandit']
    };

    user.should.have.property('name', 'tj');
    user.should.have.property('pets').with.lengthOf(4)

## Installation

    $ npm install should

## modifiers

 _should_'s assertion chaining provides an expressive way to build up an assertion, along with dummy getters such as _an_, _have_, and _be_, provided are what I am simply calling **modifiers**, which have a meaning effect on the assertion. An example of this is the _not_ getter, which negates the meaning, aka `user.should.not.have.property('name')`. In the previous example note the use of _have_, as we could omit it and still construct a valid assertion.

Some modifiers such as _include_ only have an effect with specific assertion methods, for example when asserting a substring like so: `str.should.include.string('test')`, we could omit _include_, but it helps express the meaning, however _keys_ has a strict effect, unless the _include_ modifier is used.

## chaining assertions

Some assertions can be chained, for example if a property is volatile we can first assert property existence:

    user.should.have.property('pets').with.lengthOf(4)

which is essentially equivalent to below, however the property may not exist:

    user.pets.should.have.lengthOf(4)

our dummy getters such as _and_ also help express chaining:

    user.should.be.a('object').and.have.property('name', 'tj')

## ok

Assert truthfulness:

    true.should.be.ok
    'yay'.should.be.ok
    (1).should.be.ok

or negated:

    false.should.not.be.ok
    ''.should.not.be.ok
    (0).should.not.be.ok

## true

Assert === true:

    true.should.be.true
    '1'.should.not.be.true

## false

Assert === false:

     false.should.be.false
     (0).should.not.be.false

## arguments

Assert `Arguments`:

    var args = (function(){ return arguments; })(1,2,3);
    args.should.be.arguments;
    [].should.not.be.arguments;

## empty

Asserts that length is 0:

    [].should.be.empty
    ''.should.be.empty
    ({ length: 0 }).should.be.empty

## eql

equality:

    ({ foo: 'bar' }).should.eql({ foo: 'bar' })
    [1,2,3].should.eql([1,2,3])

## equal

strict equality:

    should.strictEqual(undefined, value)
    should.strictEqual(false, value)
    (4).should.equal(4)
    'test'.should.equal('test')
    [1,2,3].should.not.equal([1,2,3])

## within

Assert inclusive numeric range:

    user.age.should.be.within(5, 50)

## a

Assert __typeof__:

    user.should.be.a('object')
    'test'.should.be.a('string')

## instanceof

Assert __instanceof__:

    user.should.be.an.instanceof(User)
    [].should.be.an.instanceof(Array)

## above

Assert numeric value above the given value:

    user.age.should.be.above(5)
    user.age.should.not.be.above(100)

## below

Assert numeric value below the given value:

    user.age.should.be.below(100)
    user.age.should.not.be.below(5)

## match

Assert regexp match:

    username.should.match(/^\w+$/)

## length

Assert _length_ property exists and has a value of the given number:

    user.pets.should.have.length(5)
    user.pets.should.have.a.lengthOf(5)

Aliases: _lengthOf_

## string

Substring assertion:

    'foobar'.should.include.string('foo')
    'foobar'.should.include.string('bar')
    'foobar'.should.not.include.string('baz')

## property

Assert property exists and has optional value:

    user.should.have.property('name')
    user.should.have.property('age', 15)
    user.should.not.have.property('rawr')
    user.should.not.have.property('age', 0)

## ownProperty

Assert own property (on the immediate object):

    ({ foo: 'bar' }).should.have.ownProperty('foo')

## contain

Assert array value:

    [1,2,3].should.contain(3)
    [1,2,3].should.contain(2)
    [1,2,3].should.not.contain(4)

## keys

Assert own object keys, which must match _exactly_,
and will fail if you omit a key or two:

    var obj = { foo: 'bar', baz: 'raz' };
    obj.should.have.keys('foo', 'bar');
    obj.should.have.keys(['foo', 'bar']);

using the _include_ modifier, we can check inclusion of a key,
but not fail when we omit a few:

    obj.should.include.keys('foo')
    obj.should.include.keys('bar')
    obj.should.not.include.keys('baz')

## respondTo

Assert that the given property is a function:

    user.should.respondTo('email')

## Express example

For example you can use should with the [Expresso TDD Framework](http://github.com/visionmedia/expresso) by simply including it:

    var lib = require('mylib')
      , should = require('should');
  
    module.exports = {
      'test .version': function(){
        lib.version.should.match(/^\d+\.\d+\.\d+$/);
      }
    };

## Running tests

To run the tests for _should_ simple update your git submodules and run:

    $ make test

## OMG IT EXTENDS OBJECT???!?!@

Yes, yes it does, with a single getter _should_, and no it wont break your code, because it does this **properly** with a non-enumerable property.

## License 

(The MIT License)

Copyright (c) 2010 TJ Holowaychuk &lt;tj@vision-media.ca&gt;

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