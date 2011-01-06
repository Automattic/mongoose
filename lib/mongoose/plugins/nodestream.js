
/**
 * Module requirements
 *
 */

var ;

/**
 * Nodestream plugin function. Automates nodestream events emission!
 *
 * @param {Object} options
 * @api public
 */

module.exports = function shortcuts(options){
  var nodestream = options.nodestream
    , editEvent = options.editEvent || function(model, doc){
        return 'edit.' + model + '.' + doc.get('id');
      }
    , editKeyEvent = options.editKeyEvent || function(model, doc, key){
        return 'edit.' + model + '.' + doc.get('id') + '.' + path;
      }
    , addEvent = options.addEvent || function(model, doc){
        return 'add.' + model;
      }
    , removeEvent = options.removeEvent || function(model, doc){
        return 'del.' + model + '.' + doc.get('id');
      };

  return function(doc){
    doc.pre('save', function(next){
      if (this.isNew)
        nodestream.emit(addEvent(this.name));
      else
        for (var i in this.dirty)
          nodestream.emit(editKeyEvent(this.name, this.doc, i));

      next();
    });

    doc.pre('remove', function(next){
      nodestream.emit(removeEvent(this.name, this));
      next();
    });
  };
};
