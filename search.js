'use strict';

const config = require('./.config');
const cheerio = require('cheerio');
const filemap = require('./docs/source');
const fs = require('fs');
const jade = require('jade');
const mongoose = require('./');

mongoose.set('useCreateIndex', true);

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  url: { type: String, required: true }
});
contentSchema.index({ title: 'text', body: 'text' });
const Content = mongoose.model('Content', contentSchema, 'Content');

const contents = [];
const files = Object.keys(filemap);

for (const filename of files) {
  const file = filemap[filename];
  console.log(file)
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
          throw err;
        }
        contents.push(content);
      }
    }
  } else if (file.guide) {
    let text = fs.readFileSync(filename, 'utf8');
    text = text.substr(text.indexOf('block content') + 'block content\n'.length);
    text = jade.render(`div\n${text}`);

    const content = new Content({
      title: file.title,
      body: text,
      url: filename.replace('.jade', '.html').replace(/^docs/, '')
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
        url: `${filename.replace('.jade', '.html').replace(/^docs/, '')}#${el.prop('id')}`
      });
  
      content.validateSync();
      contents.push(content);
    });
  }
}

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connect(config.uri, { useNewUrlParser: true, dbName: 'mongoose' });

  await Content.deleteMany({});
  for (const content of contents) {
    await content.save();
  }

  const results = await Content.
    find({ $text: { $search: 'validate' } }, { score: { $meta: 'textScore' } }).
    sort({ score: { $meta: 'textScore' } }).
    limit(10);

  console.log(results.map(res => res.url));
}