'use strict';

const config = require('../.config');
const cheerio = require('cheerio');
const filemap = require('./source');
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
  version: { type: String, required: true, default: version }
});
contentSchema.index({ title: 'text', body: 'text' });
const Content = mongoose.model('Content', contentSchema, 'Content');

const contents = [];
const files = Object.keys(filemap);

for (const filename of files) {
  const file = filemap[filename];
  if (file.api) {
    // API docs are special, raw content is in the `docs` property
    for (const _class of file.docs) {
      for (const prop of _class.props) {
        const content = new Content({
          title: `API: ${prop.string}`,
          body: prop.description,
          url: `api.html#${prop.anchorId}`
        });
        const err = content.validateSync();
        if (err != null) {
          console.log(content);
          throw err;
        }
        contents.push(content);
      }
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
    text = text.substr(text.indexOf('block content') + 'block content\n'.length);
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

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connect(config.uri, { dbName: 'mongoose' });

  await Content.deleteMany({ version });
  for (const content of contents) {
    if (version === '6.x') {
      let url = content.url.startsWith('/') ? content.url : `/${content.url}`;
      if (!url.startsWith('/docs')) {
        url = '/docs'  + url;
      }
      content.url = url;
    } else {
      const url = content.url.startsWith('/') ? content.url : `/${content.url}`;
      content.url = `/docs/${version}/docs${url}`;
    }
    await content.save();
  }

  const results = await Content.
    find({ $text: { $search: 'validate' }, version }, { score: { $meta: 'textScore' } }).
    sort({ score: { $meta: 'textScore' } }).
    limit(10);

  console.log(results.map(res => res.url));

  process.exit(0);
}