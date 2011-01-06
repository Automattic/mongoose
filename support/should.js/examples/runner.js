
/**
 * Module dependencies.
 */

var should = require('../');

function test(name, fn){
  try {
    fn();
  } catch (err) {
    console.log('    \x1b[31m%s', name);
    console.log('    %s\x1b[0m', err.stack);
    return;
  }
  console.log('  √ \x1b[32m%s\x1b[0m', name);
}

function Point(x, y) {
  this.x = x;
  this.y = y;
  this.sub = function(other){
    return new Point(
        this.x - other.x
      , this.y - other.y);
  }
}

console.log();

test('new Point(x, y)', function(){
  var point = new Point(50, 100);
  point.should.be.an.instanceof(Point);
  point.should.have.property('x', 50);
  point.should.have.property('y', 100);
});

test('Point#sub()', function(){
  var a = new Point(50, 100)
    , b = new Point(20, 50);
  a.sub(b).should.be.an.instanceof(Point);
  a.sub(b).should.not.equal(a);
  a.sub(b).should.not.equal(b);
  a.sub(b).should.have.property('x', 30);
  a.sub(b).should.have.property('y', 50);
});

test('Point#add()', function(){
  var point = new Point(50, 100);
  point.should.respondTo('add');
});

console.log();