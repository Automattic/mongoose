
/**
 * Module dependencies.
 */

var mongoose = require('./')
  , Mongoose = mongoose.Mongoose;

/**
 * Support for old way of defining models.
 *  - mongoose.model('Name', { definition });
 */

var oldModel = Mongoose.prototype.model;

Mongoose.prototype.model = function(){
  oldModel.apply(this, arguments);
};

