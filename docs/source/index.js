
exports['index.jade'] = require('./home')
exports['docs/api.jade'] = require('./api')
exports['docs/index.jade'] = { title: 'Getting Started' }
exports['docs/production.jade'] = require('./production')
exports['docs/prior.jade'] = require('./prior')
exports['docs/guide.jade'] = { guide: true, schema: true, title: 'Schemas' }
exports['docs/schematypes.jade'] = { guide: true, schema: true, title: 'SchemaTypes' }
exports['docs/middleware.jade'] = { guide: true, title: 'Middleware' }
exports['docs/plugins.jade'] = { guide: true, title: 'Plugins' }
exports['docs/subdocs.jade'] = { guide: true, docs: true, title: 'SubDocuments' }
exports['docs/documents.jade'] = { guide: true, docs: true, title: 'Documents' }
exports['docs/models.jade'] = { guide: true, title: 'Models' }
exports['docs/queries.jade'] = { guide: true, title: 'Queries' }
exports['docs/populate.jade'] = { guide: true, title: 'Query Population' }
exports['docs/migration.jade'] = { guide: true, title: 'Migration Guide' }
exports['docs/contributing.jade'] = { guide: true, title: 'Contributing' }
exports['docs/connections.jade'] = { guide: true, title: 'Connecting to MongoDB' }
exports['docs/faq.jade'] = { guide: true, title: 'FAQ' }
exports['docs/harmony.jade'] = require('./harmony');
exports['docs/browser.jade'] = require('./browser');
exports['docs/compatibility.jade'] = {
  title: 'MongoDB Version Compatibility',
  guide: true
};
