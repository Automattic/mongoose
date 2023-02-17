
'use strict';

const fs = require('fs');

let sponsors = [];
try {
  sponsors = require('../data/sponsors.json');
} catch (err) {}
let jobs = [];
try {
  jobs = require('../data/jobs.json');
} catch (err) {}

const _package = require('./../../package.json')

/**
 * Separate type from `exports`, because `exports` cannot be typed
 * @type {Object.<string, DocsOptions>}
 */
const docs = {};

docs['index.pug'] = { package: _package, title: 'ODM' };
docs['docs/api.pug'] = require('./api');
docs['docs/advanced_schemas.md'] = { title: 'Advanced Schemas', acquit: true, markdown: true };
docs['docs/validation.md'] = { title: 'Validation', acquit: true, markdown: true };
docs['docs/customschematypes.md'] = { title: 'Custom Schema Types', acquit: true, markdown: true };
docs['docs/promises.md'] = { title: 'Promises', acquit: true, markdown: true };
docs['docs/discriminators.md'] = { title: 'Discriminators', acquit: true, markdown: true };
docs['docs/defaults.md'] = { title: 'Defaults', acquit: true, markdown: true };
docs['docs/index.md'] = { title: 'Getting Started', markdown: true };
docs['docs/browser.md'] = { guide: true, title: 'Browser Library', acquit: true, markdown: true };
docs['docs/guides.md'] = { guide: true, schema: true, title: 'Schemas', markdown: true };
docs['docs/guide.md'] = { guide: true, schema: true, title: 'Schemas', acquit: true, markdown: true };
docs['docs/schematypes.md'] = { guide: true, schema: true, title: 'SchemaTypes', markdown: true };
docs['docs/middleware.md'] = { guide: true, title: 'Middleware', acquit: true, markdown: true };
docs['docs/plugins.md'] = { guide: true, title: 'Plugins', markdown: true };
docs['docs/subdocs.md'] = { guide: true, docs: true, title: 'SubDocuments', markdown: true };
docs['docs/documents.md'] = { guide: true, docs: true, title: 'Documents', markdown: true };
docs['docs/models.md'] = { guide: true, title: 'Models', markdown: true };
docs['docs/queries.md'] = { guide: true, title: 'Queries', markdown: true };
docs['docs/populate.md'] = { guide: true, title: 'Query Population', markdown: true };
docs['docs/migration.md'] = { guide: true, title: 'Migration Guide', markdown: true };
docs['docs/migrating_to_5.md'] = { guide: true, title: 'Migrating to Mongoose 5', markdown: true };
docs['docs/migrating_to_6.md'] = { guide: true, title: 'Migrating to Mongoose 6', markdown: true };
docs['docs/contributing.md'] = { guide: true, title: 'Contributing', markdown: true };
docs['docs/connections.md'] = { guide: true, title: 'Connecting to MongoDB', markdown: true };
docs['docs/lambda.md'] = { guide: true, title: 'Using Mongoose With AWS Lambda', markdown: true };
docs['docs/geojson.md'] = { guide: true, title: 'Using GeoJSON', acquit: true, markdown: true };
docs['docs/transactions.md'] = { guide: true, title: 'Transactions', acquit: true, markdown: true };
docs['docs/deprecations.md'] = { guide: true, title: 'Deprecation Warnings', markdown: true };
docs['docs/further_reading.md'] = { title: 'Further Reading', markdown: true };
docs['docs/jest.md'] = { title: 'Testing Mongoose with Jest', markdown: true };
docs['docs/faq.md'] = { guide: true, title: 'FAQ', markdown: true };
docs['docs/typescript.md'] = { guide: true, title: 'Using TypeScript with Mongoose', markdown: true };
docs['docs/compatibility.md'] = {
  title: 'MongoDB Version Compatibility',
  guide: true,
  markdown: true
};
docs['docs/timestamps.md'] = { title: 'Mongoose Timestamps', markdown: true };
docs['docs/search.pug'] = { title: 'Search' };
docs['docs/enterprise.md'] = { title: 'Mongoose for Enterprise', markdown: true };
docs['docs/sponsors.pug'] = {
  title: 'Mongoose Sponsors',
  sponsors
};
docs['docs/async-await.md'] = { title: 'Using Async/Await with Mongoose', markdown: true };
docs['docs/jobs.pug'] = {
  title: 'Mongoose MongoDB Jobs',
  jobs
};
docs['docs/change-streams.md'] = { title: 'MongoDB Change Streams in NodeJS with Mongoose', markdown: true };
docs['docs/lodash.md'] = { title: 'Using Mongoose with Lodash', markdown: true };
docs['docs/incompatible_packages.md'] = { title: 'Known Incompatible npm Packages', markdown: true };

// do sub-directories

mapSubDoc('tutorials', {
  title: `Mongoose Tutorials:`,
  acquit: true,
  markdown: true
});
mapSubDoc('typescript', {
  title: `Mongoose:`,
  markdown: true
});

for (const props of Object.values(docs)) {
  props.jobs = jobs;
}

/**
 * Map sub-directories with custom options
 * @param {String} subDoc Path to the subdoc, like "tutorials" (no beginning or ending slash)
 * @param {DocsOptions} options Options applied to all files in the subdoc (title gets appended to provided title)
 */
function mapSubDoc(subDoc, options) {
  const dirName = `docs/${subDoc}`

  const files = fs.readdirSync(dirName).filter(file => file.endsWith('.md'));

  files.forEach((filename) => {
    const content = fs.readFileSync(`${dirName}/${filename}`, 'utf8');
    docs[`${dirName}/${filename}`] = {
      ...options,
      title: `${options.title} ${content.split('\n')[0].replace(/^#+/, '').trim()}`
    };
  });
}

/**
 * @typedef {Object} DocsOptions
 * @property {String} title Title of the page
 * @property {Boolean} [acquit] Enable test parsing and insertion
 * @property {Boolean} [markdown] Enable markdown processing
 * @property {Boolean} [guide] Indicate the page is a guide
 * @property {Boolean} [schema]
 * @property {*}  [jobs] Overwrite which jobs should be listed in the page (applied automatically)
 */

module.exports = docs;