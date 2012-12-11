
var static = require('node-static');
var server = new static.Server('.', { cache: 0 });

require('http').createServer(function (req, res) {
  req.on('end', function () {
    server.serve(req, res, function (err) {
      if (err) {
        console.error(err, req.url);
        res.writeHead(err.status, err.headers);
        res.end();
      }
    });
  });
}).listen(8088);

console.error('now listening on localhost:8088');
