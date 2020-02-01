
'use strict';
exports['index.pug'] = require('./home');
exports['docs/api.pug'] = require('./api');
exports['docs/browser.pug'] = { guide: true, title: 'Browser Library', acquit: true };
exports['docs/index.pug'] = { title: 'Getting Started' };
exports['docs/production.pug'] = require('./production');
exports['docs/prior.pug'] = require('./prior');
exports['docs/guides.pug'] = { guide: true, schema: true, title: 'Schemas' };
exports['docs/guide.pug'] = { guide: true, schema: true, title: 'Schemas', acquit: true };
exports['docs/schematypes.pug'] = { guide: true, schema: true, title: 'SchemaTypes' };
exports['docs/middleware.pug'] = { guide: true, title: 'Middleware', acquit: true };
exports['docs/plugins.pug'] = { guide: true, title: 'Plugins' };
exports['docs/subdocs.pug'] = { guide: true, docs: true, title: 'SubDocuments' };
exports['docs/documents.pug'] = { guide: true, docs: true, title: 'Documents' };
exports['docs/models.pug'] = { guide: true, title: 'Models' };
exports['docs/queries.pug'] = { guide: true, title: 'Queries' };
exports['docs/populate.pug'] = { guide: true, title: 'Query Population' };
exports['docs/migration.pug'] = { guide: true, title: 'Migration Guide' };
exports['docs/migrating_to_5.pug'] = { guide: true, title: 'Migrating to Mongoose 5' };
exports['docs/contributing.pug'] = { guide: true, title: 'Contributing' };
exports['docs/connections.pug'] = { guide: true, title: 'Connecting to MongoDB' };
exports['docs/lambda.pug'] = { guide: true, title: 'Using Mongoose With AWS Lambda' };
exports['docs/geojson.pug'] = { guide: true, title: 'Using GeoJSON', acquit: true };
exports['docs/transactions.pug'] = { guide: true, title: 'Transactions', acquit: true };
exports['docs/deprecations.pug'] = { guide: true, title: 'Deprecation Warnings' };
exports['docs/further_reading.pug'] = { title: 'Further Reading' };
exports['docs/jest.pug'] = { title: 'Testing Mongoose with Jest' };
exports['docs/faq.pug'] = { guide: true, title: 'FAQ' };
exports['docs/compatibility.pug'] = {
  title: 'MongoDB Version Compatibility',
  guide: true
};
exports['docs/search.pug'] = { title: 'Search' };
exports['docs/enterprise.pug'] = { title: 'Mongoose for Enterprise' };
exports['docs/built-with-mongoose.pug'] = { title: 'Built with Mongoose' };