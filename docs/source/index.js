
exports['index.jade'] = require('./home')
exports['docs/api.jade'] = require('./api')
exports['docs/index.jade'] = {}; //require('./gettingstarted')
exports['docs/prior.jade'] = require('./prior')
exports['docs/guide.jade'] = require('./guide')
exports['docs/schematypes.jade'] = require('./guide')
exports['docs/middleware.jade'] = require('./middleware')
exports['docs/plugins.jade'] = require('./plugins')
exports['docs/subdocs.jade'] = { guide: true, docs: true }
exports['docs/models.jade'] = { guide: true }
exports['docs/queries.jade'] = { guide: true }
exports['docs/documents.jade'] = { guide: true, docs: true }
exports['docs/populate.jade'] = { guide: true }
exports['docs/validation.jade'] = { guide: true }
exports['docs/migration.jade'] = { guide: true }
exports['docs/contributing.jade'] = { guide: true }
exports['docs/faq.jade'] = { guide: true }
