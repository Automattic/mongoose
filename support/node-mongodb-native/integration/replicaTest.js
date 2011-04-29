var mongo = require('../lib/mongodb' );
var http = require( 'http' );

var N = 1000000;
var replyNo = 1;

var dbName = 'something';
var collName = 'else';

var collection = null;

var replSet = new mongo.ReplSetServers( [ new mongo.Server( 'localhost', 27017, { auto_reconnect: true } ) ] );

var db = new mongo.Db( dbName, replSet );

var runHttp = function () {
  http.createServer(function (req, res) {
    collection.findOne( {"name":"somename"}, function( err, item ) {
	  var answer = '';
      if ( !item || err) { 
        answer = 'Not found.';
      } else {
        answer = 'Found.';
      }
	  res.writeHead(200, {'Content-Type': 'text/plain'});
	  res.end( answer );
    });
	  /*res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Found.');*/
  }).listen(1080, "127.0.0.1");
  console.log('Server running at http://127.0.0.1:1080/');
}

db.open( function ( err, p_db ) {
  db.collection( collName, function( err, coll ) {
    collection = coll;
	runHttp();
  } );
} );
