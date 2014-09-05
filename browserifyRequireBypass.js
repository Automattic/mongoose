"use strict";
var transformTools = require('browserify-transform-tools');
var _ = require('underscore');

module.exports = transformTools.makeRequireTransform('requireTransform',
  {evaluateArguments: true},
  function(args, opts, cb) {
    var path = args[0];
    var excludeFiles = ['browserDocument'];
    var exclude = false;

    if ( path.search(/(document)(.js)?$/) != -1 ) {
      _.each( excludeFiles, function( excludeFile ){
        if ( opts.file.search( excludeFile + '.js' ) != -1 ){
          exclude = true;
        }
      });

      if ( exclude ) return cb();

      // var regExp = /\/\/ *@browser (.+?)\s+(.*)require\(.*\)([^\s]*)/g;
      var newPath = path.replace( /(document)(.js)?$/, 'browserDocument$2' );

      //console.log( args, opts.file );
      //console.log( newPath );

      return cb(null, "require('" +newPath + "')");
    } else {
      return cb();
    }
  });