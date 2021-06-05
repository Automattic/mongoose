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

const cheerio = require('cheerio');
const Vue = require('vue');

const layout = fs.readFileSync('./docs/layout.html', 'utf8');
const layoutRenderer = require('vue-server-renderer').createRenderer({
  template: (result, context) => {
    const $ = cheerio.load(layout, { decodeEntities: false });
    $('title').text(context.title);

    $('div#content').html(result);

    return $.html();
  }
});

require('acquit-ignore')();

const markdown = require('marked');
const highlight = require('highlight.js');
markdown.setOptions({
  highlight: function(code) {
    return highlight.highlight('JavaScript', code).value;
  }
});

const tests = [
  ...acquit.parse(fs.readFileSync('./test/geojson.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/es-next/transactions.test.es6.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/schema.alias.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/model.middleware.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/date.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/es-next/lean.test.es6.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/es-next/cast.test.es6.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/es-next/findoneandupdate.test.es6.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/custom-casting.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/es-next/getters-setters.test.es6.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/es-next/virtuals.test.es6.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/defaults.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/discriminators.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/es-next/promises.test.es6.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/schematypes.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/validation.test.js').toString()),
  ...acquit.parse(fs.readFileSync('./test/docs/schemas.test.js').toString())
];

function getVersion() {
  return require('./package.json').version;
}

function getLatestLegacyVersion(startsWith) {
  const hist = fs.readFileSync('./History.md', 'utf8').replace(/\r/g, '\n').split('\n');

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
pkg.latest4x = getLatestLegacyVersion('4.');
pkg.latest38x = getLatestLegacyVersion('3.8');

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

const cpcNoScript = `
<div class="native-inline">
  <a href="#native_link#"><span class="sponsor">Sponsor</span> #native_company# — #native_desc#</a>
</div>
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
    if (options.vue) {
      lines.splice(2, 0, cpcNoScript);
      contents = lines.join('\n');
      contents = markdown(contents);
    } else {
      lines.splice(2, 0, cpc);
      contents = lines.join('\n');
      contents = wrapMarkdown(contents, path.relative(path.dirname(filename), path.join(__dirname, 'docs/layout')));
    }
    newfile = filename.replace('.md', '.html');
  }

  options.marked = markdown;
  options.markedCode = function(v) {
    return markdown('```javascript\n' + v + '\n```');
  };
  options.filename = filename;
  options.filters = {
    markdown: function(block) {
      return markdown(block);
    }
  };

  newfile = newfile || filename.replace('.pug', '.html');
  options.outputUrl = newfile.replace(process.cwd(), '');

  if (options.vue) {
    const app = new Vue({
      template: '<div>\n' + contents + '\n</div>',
      data: () => Object.assign({}, options)
    });
    layoutRenderer.renderToString(app, Object.assign({}, options)).then(html => {
      fs.writeFile(newfile, html, function(err) {
        if (err) {
          console.error('[VUE] could not write', err.stack);
        } else {
          console.log('[VUE] %s : rendered ', new Date, newfile);
        }
      });
    });
  } else {
    pug.render(contents, options, function(err, str) {
      if (err) {
        console.error(err.stack);
        return;
      }

      fs.writeFile(newfile, str, function(err) {
        if (err) {
          console.error('could not write', err.stack);
        } else {
          console.log('%s : rendered ', new Date, newfile);
        }
      });
    });
  }
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
