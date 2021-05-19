
'use strict';
exports['index.pug'] = require('./home');
exports['docs/api.pug'] = require('./api');
exports['docs/browser.md'] = { guide: true, title: 'Browser Library', acquit: true, markdown: true };
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
exports['docs/migrating_to_5.md'] = { guide: true, title: 'Migrating to Mongoose 5', markdown: true };
exports['docs/contributing.md'] = { guide: true, title: 'Contributing', markdown: true };
exports['docs/connections.md'] = { guide: true, title: 'Connecting to MongoDB', markdown: true };
exports['docs/lambda.md'] = { guide: true, title: 'Using Mongoose With AWS Lambda', markdown: true };
exports['docs/geojson.md'] = { guide: true, title: 'Using GeoJSON', acquit: true, markdown: true };
exports['docs/transactions.md'] = { guide: true, title: 'Transactions', acquit: true, markdown: true };
exports['docs/deprecations.md'] = { guide: true, title: 'Deprecation Warnings', markdown: true };
exports['docs/further_reading.md'] = { title: 'Further Reading', markdown: true };
exports['docs/jest.md'] = { title: 'Testing Mongoose with Jest', markdown: true };
exports['docs/faq.md'] = { guide: true, title: 'FAQ', markdown: true };
exports['docs/typescript.md'] = { guide: true, title: 'Using TypeScript with Mongoose', markdown: true };
exports['docs/compatibility.md'] = {
  title: 'MongoDB Version Compatibility',
  guide: true,
  markdown: true
};
exports['docs/search.pug'] = { title: 'Search' };
exports['docs/enterprise.md'] = { title: 'Mongoose for Enterprise', markdown: true };
exports['docs/built-with-mongoose.md'] = { title: 'Built with Mongoose', markdown: true };
exports['docs/async-await.md'] = { title: 'Using Async/Await with Mongoose', markdown: true };