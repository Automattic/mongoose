
var fs = require('fs')
  , template = fs.readFileSync('template.html').toString()
  , announcement = 'announcement.html'
  , markdown = require('github-flavored-markdown');

function convert (input, output, index) {
  var contents = template.replace(
      '<!-- CONTENT -->'
    , markdown.parse(fs.readFileSync(input).toString())
  )

  if (index) {
      contents = contents.replace(
          '<!-- ANNOUNCE -->'
        , markdown.parse(fs.readFileSync(announcement).toString())
      )
  }

  fs.writeFileSync(output, contents);
};

if (process.argv.length > 2 && 'index' === process.argv[2]) {
  convert('README.md', 'index.html', true);
}

convert('docs/defaults.md', 'docs/defaults.html');
convert('docs/embedded-documents.md', 'docs/embedded-documents.html');
convert('docs/finding-documents.md', 'docs/finding-documents.html');
convert('docs/updating-documents.md', 'docs/updating-documents.html');
convert('docs/indexes.md', 'docs/indexes.html');
convert('docs/middleware.md', 'docs/middleware.html');
convert('docs/model-definition.md', 'docs/model-definition.html');
convert('docs/schematypes.md', 'docs/schematypes.html');
convert('docs/validation.md', 'docs/validation.html');
convert('docs/virtuals.md', 'docs/virtuals.html');
convert('docs/getters-setters.md', 'docs/getters-setters.html');
convert('docs/methods-statics.md', 'docs/methods-statics.html');
convert('docs/plugins.md', 'docs/plugins.html');
convert('docs/populate.md', 'docs/populate.html');
convert('docs/errors.md', 'docs/errors.html');
convert('docs/migration-guide.md', 'docs/migration-1x-2x.html');
convert('docs/query.md', 'docs/query.html');
convert('docs/querystream.md', 'docs/querystream.html');
convert('docs/schema-options.md', 'docs/schema-options.html');
convert('docs/in-the-wild.md', 'docs/in-the-wild.html');
