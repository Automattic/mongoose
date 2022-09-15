'use strict';

Error.stackTraceLimit = Infinity;

const acquit = require('acquit');
const fs = require('fs');
const path = require('path');
const pug = require('pug');
const pkg = require('../package.json');
const transform = require('acquit-require');

// using "__dirname" and ".." to have a consistent CWD, this script should not be runnable, even when not being in the root of the project
// also a consistent root path so that it is easy to change later when the script should be moved
const cwd = path.resolve(__dirname, '..');

const isMain = require.main === module;

let jobs = [];
try {
  jobs = require('../docs/data/jobs.json');
} catch (err) {}

let opencollectiveSponsors = [];
try {
  opencollectiveSponsors = require('../docs/data/opencollective.json');
} catch (err) {}

require('acquit-ignore')();

const { marked: markdown } = require('marked');
const highlight = require('highlight.js');
const { promisify } = require("util");
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

const testPath = path.resolve(cwd, 'test')

const tests = [
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'geojson.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/transactions.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'schema.alias.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'model.middleware.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/date.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/lean.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/cast.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/findoneandupdate.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/custom-casting.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/getters-setters.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/virtuals.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/defaults.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/discriminators.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/promises.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/schematypes.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/validation.test.js')).toString()),
  ...acquit.parse(fs.readFileSync(path.join(testPath, 'docs/schemas.test.js')).toString())
];

function getVersion() {
  return require('../package.json').version;
}

function getLatestLegacyVersion(startsWith) {
  const hist = fs.readFileSync(path.join(cwd, 'CHANGELOG.md'), 'utf8').replace(/\r/g, '\n').split('\n');

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

// Create api dir if it doesn't already exist
try {
  fs.mkdirSync(path.join(cwd, './docs/api'));
} catch (err) {} // eslint-disable-line no-empty

require('../docs/splitApiDocs');
const filemap = Object.assign({}, require('../docs/source'), require('../docs/tutorials'), require('../docs/typescript'));
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

async function pugify(filename, options) {
  let newfile = undefined;
  options = options || {};
  options.package = pkg;

  const _editLink = 'https://github.com/Automattic/mongoose/blob/master' +
    filename.replace(cwd, '');
  options.editLink = options.editLink || _editLink;

  let contents = fs.readFileSync(path.resolve(cwd, filename)).toString();

  if (options.acquit) {
    contents = transform(contents, tests);
  }
  if (options.markdown) {
    const lines = contents.split('\n');
    lines.splice(2, 0, cpc);
    contents = lines.join('\n');
    contents = wrapMarkdown(contents, path.relative(path.dirname(filename), path.join(cwd, 'docs/layout')));
    newfile = filename.replace('.md', '.html');
  }

  options.filename = filename;
  options.filters = {
    markdown: function(block) {
      return markdown.parse(block);
    }
  };

  newfile = newfile || filename.replace('.pug', '.html');
  options.outputUrl = newfile.replace(cwd, '');
  options.jobs = jobs;

  options.opencollectiveSponsors = opencollectiveSponsors;

  const str = await promisify(pug.render)(contents, options).catch(console.error);

  if (typeof str !== "string") {
    return;
  }
  
  await fs.promises.writeFile(newfile, str).catch((err) => {
    console.error('could not write', err.stack);
  }).then(() => {
    console.log('%s : rendered ', new Date(), newfile);
  });
}

// extra function to start watching for file-changes, without having to call this file directly with "watch"
function startWatch() {
  files.forEach((file) => {
    const filepath = path.resolve(cwd, file);
    fs.watchFile(filepath, { interval: 1000 }, (cur, prev) => {
      if (cur.mtime > prev.mtime) {
        pugify(filepath, filemap[file]);
      }
    });
  });

  fs.watchFile(path.join(cwd, 'docs/layout.pug'), { interval: 1000 }, (cur, prev) => {
    if (cur.mtime > prev.mtime) {
      console.log('docs/layout.pug modified, reloading all files');
      pugifyAllFiles(true);
    }
  });
}

async function pugifyAllFiles(noWatch) {
  await Promise.all(files.map(async (file) => {
    const filename = path.join(cwd, file);
    await pugify(filename, filemap[file]);
  }));

  // enable watch after all files have been done once, and not in the loop to use less-code
  // only enable watch if main module AND having argument "--watch"
  if (!noWatch && isMain && process.argv[2] === '--watch') {
    startWatch();
  }
}

exports.default = pugify;
exports.pugify = pugify;
exports.startWatch = startWatch;
exports.pugifyAllFiles = pugifyAllFiles;
exports.cwd = cwd;

// only run the following code if this file is the main module / entry file
if (isMain) {
   pugifyAllFiles();
}
