
/**
 * Module dependencies.
 */

var assert = require('assert')
  , http = require('http');

var server = http.createServer(function(req, res){
    if (req.method === 'GET') {
        if (req.url === '/delay') {
            setTimeout(function(){
                res.writeHead(200, {});
                res.end('delayed');
            }, 200);
        } else {
            var body = JSON.stringify({ name: 'tj' });
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf8',
                'Content-Length': body.length
            });
            res.end(body);
        }
    } else {
        var body = '';
        req.setEncoding('utf8');
        req.addListener('data', function(chunk){ body += chunk });
        req.addListener('end', function(){
            res.writeHead(200, {});
            res.end(req.url + ' ' + body);
        });
    }
});

var delayedServer = http.createServer(function(req, res){
  res.writeHead(200);
  res.end('it worked');
});

var oldListen = delayedServer.listen;
delayedServer.listen = function(){
  var args = arguments;
  setTimeout(function(){
    oldListen.apply(delayedServer, args);
  }, 100);
};

module.exports = {
    'test assert.response()': function(beforeExit){
        var called = 0;

        assert.response(server, {
            url: '/',
            method: 'GET'
        },{
            body: '{"name":"tj"}',
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf8'
            }
        });

        assert.response(server, {
            url: '/foo',
            method: 'POST',
            data: 'bar baz'
        },{
            body: '/foo bar baz',
            status: 200
        }, function(res){
            ++called;
            assert.ok(res);
        });

        assert.response(server, {
            url: '/foo'
        }, function(res){
            ++called;
            assert.ok(res.body.indexOf('tj') >= 0, 'Test assert.response() callback');
        });

        assert.response(server,
            { url: '/delay', timeout: 300 },
            { body: 'delayed' });

        beforeExit(function(){
            assert.equal(2, called);
        });
    },

    'test assert.response() regexp': function(){
      assert.response(server,
        { url: '/foo', method: 'POST', data: 'foobar' },
        { body: /^\/foo foo(bar)?/ });
    },
    
    'test assert.response() regexp headers': function(){
      assert.response(server,
        { url: '/' },
        { body: '{"name":"tj"}', headers: { 'Content-Type': /^application\/json/ } });
    },

    // [!] if this test doesn't pass, an uncaught ECONNREFUSED will display
    'test assert.response() with deferred listen()': function(){
      assert.response(delayedServer,
        { url: '/' },
        { body: 'it worked' });
    }
};
