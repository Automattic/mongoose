
/**
 * Module requirements
 *
 */

var ;

/**
 * Shortcuts plugin function
 *
 * @param {Object} options
 * @api public
 */

module.exports = function shortcuts(options){
  return function(doc){
    doc.inherit('init', function(){
      // register getters/setters for paths
    });
  };
};

