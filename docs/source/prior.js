var fs = require('fs')
var releases = fs.readFileSync(__dirname + '/../releases', 'utf8');
releases = releases.split('\n').filter(Boolean);

module.exports = exports = {
  releases: releases.map(function (version) {
    return {
        url: version + '/'
      , version: version
    }
  })
}
