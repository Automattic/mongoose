'use strict';

Error.stackTraceLimit = Infinity;

const acquit = require('acquit');
const fs = require('fs');
const path = require('path');
const pug = require('pug');
const pkg = require('./package');
const linktype = require('./docs/helpers/linktype');
const href = require('./docs/helpers/href');
const klass = require('./docs/helpers/klass');
const transform = require('acquit-require');

let jobs = [];
try {
  jobs = require('./docs/data/jobs.json');
} catch (err) {}

let opencollectiveSponsors = [];
try {
  opencollectiveSponsors = require('./docs/data/opencollective.json');
} catch (err) {}

require('acquit-ignore')();

const { marked: markdown } = require('marked');
const highlight = require('highlight.js');
const renderer = {
  heading: function(text, level, raw, slugger) {
    const slug = slugger.slug(raw);
    return `<h${level} id="${slug}">
      <a href="#${slug}">
        ${text}
      </a>
    </h${level}>\n`;
  }
};
markdown.setOptions({
  highlight: function(code, language) {
    if (!language) {
      language = 'javascript';
    }
    if (language === 'no-highlight') {
      return code;
    }
    return highlight.highlight(code, { language }).value;
  }
});
markdown.use({ renderer });

const tests = [
  ...acquit.parse(fs.readFileSync('./test/geojson.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/transactions.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/schema.alias.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/model.middleware.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/date.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/lean.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/cast.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/findoneandupdate.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/custom-casting.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/getters-setters.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/virtuals.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/defaults.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/discriminators.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/promises.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/schematypes.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/validation.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/schemas.test.js').toString())
];

function getVersion() {
  return require('./package.json').version;
}

function getLatestLegacyVersion(startsWith) {
  const hist = fs.readFileSync('./CHANGELOG.md', 'utf8').replace(/\r/g, '\n').split('\n');

  for (const rawLine of hist) {
    const line = (rawLine || '').trim();
    if (!line) {
      continue;
    }
    const match = /^\s*([^\s]+)\s/.exec(line);
    if (match && match[1] && match[1].startsWith(startsWith)) {
      return match[1];
    }
  }

  throw new Error('no match found');
}

// use last release
pkg.version = getVersion();
pkg.latest5x = getLatestLegacyVersion('5.');
pkg.latest4x = getLatestLegacyVersion('4.');
pkg.latest38x = getLatestLegacyVersion('3.8');

// Create api dir if it doesn't already exist
try {
  fs.mkdirSync('./docs/api');
} catch (err) {} // eslint-disable-line no-empty

require('./docs/splitApiDocs');
const filemap = Object.assign({}, require('./docs/source'), require('./docs/tutorials'), require('./docs/typescript'));
const files = Object.keys(filemap);

const wrapMarkdown = (md, baseLayout) => `
extends ${baseLayout}

append style
  link(rel="stylesheet", href="/docs/css/inlinecpc.css")
  script(type="text/javascript" src="/docs/js/native.js")
  style.
    p { line-height: 1.5em }

block content
  <a class="edit-docs-link" href="#{editLink}" target="_blank">
    <img src="/docs/images/pencil.svg" />
  </a>
  :markdown
${md.split('\n').map(line => '    ' + line).join('\n')}
`;

const cpc = `
<script>
  _native.init("CK7DT53U",{
    targetClass: 'native-inline'
  });
</script>

<div class="native-inline">
  <a href="#native_link#"><span class="sponsor">Sponsor</span> #native_company# — #native_desc#</a>
</div>
`;

function pugify(filename, options, newfile) {
  options = options || {};
  options.package = pkg;
  options.linktype = linktype;
  options.href = href;
  options.klass = klass;

  const _editLink = 'https://github.com/Automattic/mongoose/blob/master' +
    filename.replace(process.cwd(), '');
  options.editLink = options.editLink || _editLink;

  let contents = fs.readFileSync(filename).toString();

  if (options.acquit) {
    contents = transform(contents, tests);
  }
  if (options.markdown) {
    const lines = contents.split('\n');
    lines.splice(2, 0, cpc);
    contents = lines.join('\n');
    contents = wrapMarkdown(contents, path.relative(path.dirname(filename), path.join(__dirname, 'docs/layout')));
    newfile = filename.replace('.md', '.html');
  }

  options.marked = markdown;
  options.markedCode = function(v) {
    return markdown.parse('```javascript\n' + v + '\n```');
  };
  options.filename = filename;
  options.filters = {
    markdown: function(block) {
      return markdown.parse(block);
    }
  };

  newfile = newfile || filename.replace('.pug', '.html');
  options.outputUrl = newfile.replace(process.cwd(), '');
  options.jobs = jobs;

  options.opencollectiveSponsors = opencollectiveSponsors;

  pug.render(contents, options, function(err, str) {
    if (err) {
      console.error(err.stack);
      return;
    }

    fs.writeFile(newfile, str, function(err) {
      if (err) {
        console.error('could not write', err.stack);
      } else {
        console.log('%s : rendered ', new Date(), newfile);
      }
    });
  });
}

files.forEach(function(file) {
  const filename = __dirname + '/' + file;
  pugify(filename, filemap[file]);

  if (process.argv[2] === '--watch') {
    fs.watchFile(filename, { interval: 1000 }, function(cur, prev) {
      if (cur.mtime > prev.mtime) {
        pugify(filename, filemap[file]);
      }
    });
  }
});
