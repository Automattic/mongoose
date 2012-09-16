
exports['index.jade'] = require('./home')
exports['docs/api.jade'] = require('./api')
exports['docs/index.jade'] = { title: 'Getting Started' }
exports['docs/prior.jade'] = require('./prior')
exports['docs/guide.jade'] = { guide: true, schema: true, title: 'Schemas' }
exports['docs/schematypes.jade'] = { guide: true, schema: true, title: 'SchemaTypes' }
exports['docs/middleware.jade'] = { guide: true, title: 'Middleware' }
exports['docs/plugins.jade'] = { guide: true, title: 'Plugins' }
exports['docs/subdocs.jade'] = { guide: true, docs: true, title: 'SubDocuments' }
exports['docs/models.jade'] = { guide: true, title: 'Models' }
exports['docs/queries.jade'] = { guide: true, title: 'Queries' }
exports['docs/documents.jade'] = { guide: true, docs: true, title: 'Documents' }
exports['docs/populate.jade'] = { guide: true, title: 'Query Population' }
exports['docs/validation.jade'] = { guide: true, title: 'Validation' }
exports['docs/migration.jade'] = { guide: true, title: 'Migration Guide' }
exports['docs/contributing.jade'] = { guide: true, title: 'Contributing' }
exports['docs/faq.jade'] = { guide: true, title: 'FAQ' }
