var assert = require('assert');

var testStrings = [
  'person','man','woman','child','sex','move','Person','Man','Woman','Child',
  'Sex','Move','equipment','information','rice','money','species','series',
  'fish','sheep','deer','Equipment','Information','Rice','Money','Species',
  'Series','Fish','Sheep','Deer','octopus','wolf','potato','fool','blue',
  'bus','student','tuna','Octopus','Wolf','Potato','Fool','Blue','Bus',
  'Student','Tuna','news','News','mouse','Mouse','information','Information',
  'ox','Ox','virus','Virus','archive','Archive','louse','Louse','curve','Curve'
];

var pluralize = require('mongoose/util').string.pluralize;
var subclass = require('mongoose/util').subclass;

module.exports = {
  
  'test model name pluralization': function(){
    assert.ok(pluralize('person') == 'people');
    assert.ok(pluralize('woman') == 'women');
    assert.ok(pluralize('sheep') == 'sheep');
    assert.ok(pluralize('information') == 'information');
    assert.ok(pluralize('money') == 'money');
    assert.ok(pluralize('virus') == 'viri');
    assert.ok(pluralize('test') == 'tests');
    assert.ok(pluralize('bully') == 'bullies');
    assert.ok(pluralize('survey') == 'surveys');
  },
  
  'test subclass of Native constructors': function(){
    var EmbeddedArray = subclass(Array, {
      test: function(){}
    }) 
    , arr = []
    , ea = new EmbeddedArray();

    assert.ok(ea instanceof EmbeddedArray);
    assert.ok(Array.isArray(ea));
    assert.ok(ea instanceof Array);
    assert.ok(typeof ea.test == 'function');
    assert.ok(typeof arr.test == 'undefined');
    assert.ok(Object.prototype.toString.call(ea) == '[object Array]');
  }
  
};