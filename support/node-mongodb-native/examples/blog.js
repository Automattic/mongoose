GLOBAL.DEBUG = true;

sys = require("sys");
test = require("mjsunit");

var mongo = require('../lib/mongodb');

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;

var LINE_SIZE = 120;

sys.puts("Connecting to " + host + ":" + port);
var db = new mongo.Db('node-mongo-blog', new mongo.Server(host, port, {}), {});
db.open(function(err, db) {
  db.dropDatabase(function(err, result) {
    sys.puts("===================================================================================");
    sys.puts(">> Adding Authors");
    db.collection('authors', function(err, collection) {
      collection.createIndex(["meta", ['_id', 1], ['name', 1], ['age', 1]], function(err, indexName) {
        sys.puts("===================================================================================");        
        var authors = {};
        
        // Insert authors
        collection.insert([{'name':'William Shakespeare', 'email':'william@shakespeare.com', 'age':587},
          {'name':'Jorge Luis Borges', 'email':'jorge@borges.com', 'age':123}], function(err, docs) {
            docs.forEach(function(doc) {
              sys.puts(sys.inspect(doc));
              authors[doc.name] = doc;
            });
        });

        sys.puts("===================================================================================");        
        sys.puts(">> Authors ordered by age ascending");        
        sys.puts("===================================================================================");        
        collection.find({}, {'sort':[['age', 1]]}, function(err, cursor) {
          cursor.each(function(err, author) {
            if(author != null) {
              sys.puts("[" + author.name + "]:[" + author.email + "]:[" + author.age + "]");
            } else {
              sys.puts("===================================================================================");        
              sys.puts(">> Adding users");        
              sys.puts("===================================================================================");                        
              db.collection('users', function(err, userCollection) {
                var users = {};
                
                userCollection.insert([{'login':'jdoe', 'name':'John Doe', 'email':'john@doe.com'}, 
                  {'login':'lsmith', 'name':'Lucy Smith', 'email':'lucy@smith.com'}], function(err, docs) {
                    docs.forEach(function(doc) {
                      sys.puts(sys.inspect(doc));
                      users[doc.login] = doc;
                    });              
                });
        
                sys.puts("===================================================================================");        
                sys.puts(">> Users ordered by login ascending");        
                sys.puts("===================================================================================");        
                userCollection.find({}, {'sort':[['login', 1]]}, function(err, cursor) {
                  cursor.each(function(err, user) {
                    if(user != null) {
                      sys.puts("[" + user.login + "]:[" + user.name + "]:[" + user.email + "]");
                    } else {
                      sys.puts("===================================================================================");        
                      sys.puts(">> Adding articles");        
                      sys.puts("===================================================================================");                                              
                      db.collection('articles', function(err, articlesCollection) {
                        articlesCollection.insert([
                          { 'title':'Caminando por Buenos Aires', 
                            'body':'Las callecitas de Buenos Aires tienen ese no se que...', 
                            'author_id':authors['Jorge Luis Borges']._id},
                          { 'title':'I must have seen thy face before', 
                            'body':'Thine eyes call me in a new way', 
                            'author_id':authors['William Shakespeare']._id, 
                            'comments':[{'user_id':users['jdoe']._id, 'body':"great article!"}]
                          }
                        ], function(err, docs) {
                          docs.forEach(function(doc) {
                            sys.puts(sys.inspect(doc));
                          });              
                        })
                        
                        sys.puts("===================================================================================");        
                        sys.puts(">> Articles ordered by title ascending");        
                        sys.puts("===================================================================================");        
                        articlesCollection.find({}, {'sort':[['title', 1]]}, function(err, cursor) {
                          cursor.each(function(err, article) {
                            if(article != null) {
                              sys.puts("[" + article.title + "]:[" + article.body + "]:[" + article.author_id.toHexString() + "]");
                              sys.puts(">> Closing connection");
                              db.close();
                            }
                          });
                        });
                      });
                    }
                  });
                });
              });              
            }
          });
        });
      });
    });
  });
});