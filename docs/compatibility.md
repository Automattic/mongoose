# MongoDB Server Version Compatibility

Mongoose relies on the [MongoDB Node.js Driver](http://mongodb.github.io/node-mongodb-native/) to talk to MongoDB. 
You can refer to [this table](https://docs.mongodb.com/drivers/node/current/compatibility/) for up-to-date information as to which version of the MongoDB driver supports which version of MongoDB.

Below are the [semver](http://semver.org/) ranges representing which versions of mongoose are compatible with the listed versions of MongoDB server.

* MongoDB Server 2.4.x: mongoose `^3.8` or `4.x`
* MongoDB Server 2.6.x: mongoose `^3.8.8` or `4.x`
* MongoDB Server 3.0.x: mongoose `^3.8.22`, `4.x`, or `5.x`
* MongoDB Server 3.2.x: mongoose `^4.3.0` or `5.x`
* MongoDB Server 3.4.x: mongoose `^4.7.3` or `5.x`
* MongoDB Server 3.6.x: mongoose `5.x`
* MongoDB Server 4.0.x: mongoose `^5.2.0`
* MongoDB Server 4.2.x: mongoose `^5.7.0`
* MongoDB Server 4.4.x: mongoose `^5.10.0`
* MongoDB Server 5.x: mongoose `^6.0.0`

Note that Mongoose 5.x dropped support for all versions of MongoDB before 3.0.0. If you need to use MongoDB 2.6 or older, use Mongoose 4.x.
