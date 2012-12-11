var fs = require('fs')
var releases = fs.readFileSync(__dirname + '/../releases', 'utf8');
releases = releases.split('\n').filter(Boolean);

module.exports = exports = {
    title: ''
  , releases: releases.map(function (version) {
      return {
          url: '/docs/' + version + '/'
        , version: version
      }
    })
}
