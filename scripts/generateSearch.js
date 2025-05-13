'use strict';

const isMain = require.main === module;

const cheerio = require('cheerio');
const docsFilemap = require('../docs/source');
const fs = require('fs');
const pug = require('pug');
const mongoose = require('../');
let { version } = require('../package.json');

const { marked: markdown } = require('marked');
const highlight = require('highlight.js');
markdown.setOptions({
  highlight: function(code) {
    return highlight.highlight(code, { language: 'JavaScript' }).value;
  }
});

// 5.13.5 -> 5.x, 6.8.2 -> 6.x, etc.
version = version.slice(0, version.indexOf('.')) + '.x';

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true },
  version: { type: String, required: true, default: version },
  versionNumber: { type: Number, required: true, default: version.replace(/\.x$/, '') }
});
contentSchema.index({ title: 'text', body: 'text' });
const Content = mongoose.model('Content', contentSchema, 'Content');

function generateContents() {
  const contents = [];

  for (const [filename, file] of Object.entries(docsFilemap.fileMap)) {
    if (file.api) {
      for (const prop of file.props) {
        const content = new Content({
          title: `API: ${prop.name}`,
          body: prop.description,
          url: `${filename}#${prop.anchorId}`
        });
        const err = content.validateSync();
        if (err != null) {
          console.error(content);
          throw err;
        }
        contents.push(content);
      }
    } else if (file.markdown) {
      let text = fs.readFileSync(filename, 'utf8');
      text = markdown.parse(text);

      const content = new Content({
        title: file.title,
        body: text,
        url: filename.replace('.md', '.html').replace(/^docs/, '')
      });

      content.validateSync();

      const $ = cheerio.load(text);

      contents.push(content);

      // Break up individual h3's into separate content for more fine grained search
      $('h3').each((index, el) => {
        el = $(el);
        const title = el.text();
        const html = el.nextUntil('h3').html();
        const content = new Content({
          title: `${file.title}: ${title}`,
          body: html,
          url: `${filename.replace('.md', '.html').replace(/^docs/, '')}#${el.prop('id')}`
        });

        content.validateSync();
        contents.push(content);
      });
    } else if (file.guide) {
      let text = fs.readFileSync(filename, 'utf8');
      text = text.substring(text.indexOf('block content') + 'block content\n'.length);
      text = pug.render(`div\n${text}`, { filters: { markdown }, filename });

      const content = new Content({
        title: file.title,
        body: text,
        url: filename.replace('.pug', '.html').replace(/^docs/, '')
      });

      content.validateSync();

      const $ = cheerio.load(text);

      contents.push(content);

      // Break up individual h3's into separate content for more fine grained search
      $('h3').each((index, el) => {
        el = $(el);
        const title = el.text();
        const html = el.nextUntil('h3').html();
        const content = new Content({
          title: `${file.title}: ${title}`,
          body: html,
          url: `${filename.replace('.pug', '.html').replace(/^docs/, '')}#${el.prop('id')}`
        });

        content.validateSync();
        contents.push(content);
      });
    }
  }

  return contents;
}

async function generateSearch(config) {
  await mongoose.connect(config.uri, { dbName: 'mongoose' });

  // wait for the index to be created
  await Content.init();

  await Content.deleteMany({ version });

  const contents = generateContents();

  const promises = [];
  let lastPrint = 0;

  let doneCount = 0;
  console.log('Search Content to save:', contents.length);
  for (const content of contents) {
    if (version === '8.x') {
      let url = content.url.startsWith('/') ? content.url : `/${content.url}`;
      if (!url.startsWith('/docs')) {
        url = '/docs' + url;
      }
      content.url = url;
    } else {
      let url = content.url.startsWith('/') ? content.url : `/${content.url}`;
      if (!url.startsWith('/docs')) {
        url = '/docs' + url;
      }
      content.url = `/docs/${version}${url}`;
    }
    const promise = content.save().then(() => {
      doneCount += 1;
      const nowDate = Date.now();
      // only print every 2 seconds, or if it is the first or last element
      if (nowDate - lastPrint > 2000 || doneCount === contents.length || doneCount === 1) {
        lastPrint = nowDate;
        console.log(`${doneCount} / ${contents.length}`);
      }
    });
    promises.push(promise);
  }

  await Promise.allSettled(promises);

  const results = await Content.
    find({ $text: { $search: 'validate' }, version }, { score: { $meta: 'textScore' } }).
    sort({ score: { $meta: 'textScore' } }).
    limit(10);

  console.log(results.map(res => res.url));

  console.log(`Added ${contents.length} Search Content`);

  // this likely should not be done as part of this script, but by the caller,
  // but this script is currently the only one that connects in the website generation.
  await mongoose.disconnect();
}

function getConfig() {
  const config = require('../.config.js');

  if (!config || !config.uri) {
    throw new Error('No Config or config.URI given, please create a .config.js file with those values in the root of the repository');
  }

  return config;
}

module.exports.generateSearch = generateSearch;
module.exports.getConfig = getConfig;

// only run the following code if this file is the main module / entry file
if (isMain) {
  (async function main() {
    const config = getConfig();
    try {
      await generateSearch(config);
    } catch (error) {
      console.error(error);
      process.exit(-1);
    } finally {
      await mongoose.disconnect();
    }
  })();
}
