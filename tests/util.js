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

var pluralize = require('../lib/mongoose/util').string.pluralize;

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
  }
  
};