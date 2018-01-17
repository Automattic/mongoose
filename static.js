const static = require('node-static');
const server = new static.Server('.', {cache: 0});

require('http').createServer(function(req, res) {
  if (req.url === '/favicon.ico') {
    req.destroy();
    res.statusCode = 204;
    return res.end();
  }

  req.on('end', function() {
    server.serve(req, res, function(err) {
      if (err) {
        console.error(err, req.url);
        res.writeHead(err.status, err.headers);
        res.end();
      }
    });
  });
  req.resume();
}).listen(8088);

console.error('now listening on http://localhost:8088');
