
'use strict';
exports['index.jade'] = require('./home');
exports['docs/api.jade'] = require('./api');
exports['docs/browser.jade'] = { guide: true, title: 'Browser Library', acquit: true };
exports['docs/index.jade'] = { title: 'Getting Started' };
exports['docs/production.jade'] = require('./production');
exports['docs/prior.jade'] = require('./prior');
exports['docs/guides.jade'] = { guide: true, schema: true, title: 'Schemas' };
exports['docs/guide.jade'] = { guide: true, schema: true, title: 'Schemas', acquit: true };
exports['docs/schematypes.jade'] = { guide: true, schema: true, title: 'SchemaTypes' };
exports['docs/middleware.jade'] = { guide: true, title: 'Middleware', acquit: true };
exports['docs/plugins.jade'] = { guide: true, title: 'Plugins' };
exports['docs/subdocs.jade'] = { guide: true, docs: true, title: 'SubDocuments' };
exports['docs/documents.jade'] = { guide: true, docs: true, title: 'Documents' };
exports['docs/models.jade'] = { guide: true, title: 'Models' };
exports['docs/queries.jade'] = { guide: true, title: 'Queries' };
exports['docs/populate.jade'] = { guide: true, title: 'Query Population' };
exports['docs/migration.jade'] = { guide: true, title: 'Migration Guide' };
exports['docs/migrating_to_5.jade'] = { guide: true, title: 'Migrating to Mongoose 5' };
exports['docs/contributing.jade'] = { guide: true, title: 'Contributing' };
exports['docs/connections.jade'] = { guide: true, title: 'Connecting to MongoDB' };
exports['docs/lambda.jade'] = { guide: true, title: 'Using Mongoose With AWS Lambda' };
exports['docs/geojson.jade'] = { guide: true, title: 'Using GeoJSON', acquit: true };
exports['docs/transactions.jade'] = { guide: true, title: 'Transactions', acquit: true };
exports['docs/deprecations.jade'] = { guide: true, title: 'Deprecation Warnings' };
exports['docs/further_reading.jade'] = { title: 'Further Reading' };
exports['docs/jest.jade'] = { title: 'Testing Mongoose with Jest' };
exports['docs/faq.jade'] = { guide: true, title: 'FAQ' };
exports['docs/compatibility.jade'] = {
  title: 'MongoDB Version Compatibility',
  guide: true
};
exports['docs/search.jade'] = { title: 'Search' };
