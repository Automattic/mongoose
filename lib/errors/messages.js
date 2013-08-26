
/**
 * The default built-in validator error messages.
 *
 *     // customize like so
 *     var mongoose = require('mongoose');
 *     mongoose.Error.Messages.String.enum  = "Your custom message for {PATH}.";
 *
 * TODO: Document templating
 *
 * Click the "show code" link below to see all defaults.
 *
 * @property Messages
 * @receiver MongooseError
 * @api public
 */

var msg = module.exports = exports = {};

msg.general = {};
msg.general.default = "Validator failed for path `{PATH}` with value `{VALUE}`";
msg.general.required = "Path `{PATH}` is required.";

msg.Number = {};
msg.Number.min = "Path `{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).";
msg.Number.max = "Path `{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).";

msg.String = {};
msg.String.enum = "`{VALUE}` is not a valid enum value for path `{PATH}`.";
msg.String.match = "Path `{PATH}` is invalid ({VALUE}).";

