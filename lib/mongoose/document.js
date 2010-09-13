var sys = require('sys')
  , EventEmitter = require('events').EventEmitter;

var Document = this.Base = function(){
  
};

sys.inherits(Document, EventEmitter);

var Model = this.Model = function(){
  
};

sys.inherits(Model, Document);

var EmbeddedDocument = this.EmbeddedDocuemnt = function(){
  
};

sys.inherits(EmbeddedDocument, Document);