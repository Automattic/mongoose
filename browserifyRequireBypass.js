"use strict";
var transformTools = require('browserify-transform-tools');
var _ = require('underscore');

module.exports = transformTools.makeRequireTransform('requireTransform',
  {evaluateArguments: true},
  function(args, opts, cb) {
    var path = args[0];

    var files = [{
      name: 'document',
      to: 'browserDocument',
      exclude: ['browserDocument']
    },{
      name: 'objectid',
      to: 'browserObjectid',
      exclude: ['/lib/schema/index', '/lib/schema/array', '/bson'],
      not: '/schema/objectid'
    },{
      name: 'buffer',
      to: 'browserBuffer',
      exclude: ['/lib/schema/index', '/lib/schema/array']
    }];

    var newPath;

    _.each( files, function( file ){
      var rExpr = new RegExp('^(.*/)('+ file.name + ')(.js)?$');
      var exclude = false;

      if ( file.not && path.search( file.not ) != -1 ){
        return;
      }

      if ( path.search( rExpr ) != -1 ) {
        _.each( file.exclude, function( excludedFile ){
          if ( opts.file.search( excludedFile + '.js' ) != -1 ){
            exclude = true;
          }
        });

        if ( exclude ) return;

        // var regExp = /\/\/ *@browser (.+?)\s+(.*)require\(.*\)([^\s]*)/g;
        newPath = path.replace( rExpr, '$1' + file.to + '$3' );

        //console.log( args, opts.file );
        //console.log( newPath, opts.file );
      }
    });

    if ( newPath ){
      return cb(null, "require('" + newPath + "')");
    } else {
      return cb();
    }

  });