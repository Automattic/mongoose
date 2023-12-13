# TLS/SSL Connections

Mongoose supports connecting to [MongoDB clusters that require TLS/SSL connections](https://www.mongodb.com/docs/manual/tutorial/configure-ssl/). Setting the `tls` option to `true` in [`mongoose.connect()`](../api/mongoose.html#mongoose_Mongoose-connect) or your connection string is enough to connect to a MongoDB cluster using TLS/SSL:

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/test', { tls: true });

// Equivalent:
mongoose.connect('mongodb://127.0.0.1:27017/test?tls=true');
```

The `tls` option defaults to `false` for connection strings that start with `mongodb://`. However,
the `tls` option defaults to `true` for connection strings that start with `mongodb+srv://`. So if you are using an srv connection string to connect to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), TLS/SSL is enabled by default.

If you try to connect to a MongoDB cluster that requires TLS/SSL without enabling the `tls`/`ssl` option, `mongoose.connect()` will error out with the below error:

```no-highlight
MongooseServerSelectionError: connection <monitor> to 127.0.0.1:27017 closed
    at NativeConnection.Connection.openUri (/node_modules/mongoose/lib/connection.js:800:32)
    ...
```

## TLS/SSL Validation

By default, Mongoose validates the TLS/SSL certificate against a [certificate authority](https://en.wikipedia.org/wiki/Certificate_authority) to ensure the TLS/SSL certificate is valid. To disable this validation, set the `tlsAllowInvalidCertificates` (or `tlsInsecure`) option to `true`.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/test', {
  tls: true,
  tlsAllowInvalidCertificates: true,
});
```

In most cases, you should not disable TLS/SSL validation in production. However, `tlsAllowInvalidCertificates: true` is often helpful
for debugging SSL connection issues. If you can connect to MongoDB with `tlsAllowInvalidCertificates: true`, but not with
`tlsAllowInvalidCertificates: false`, then you can confirm Mongoose can connect to the server and the server is configured to use
TLS/SSL correctly, but there's some issue with the certificate.

For example, a common issue is the below error message:

```no-highlight
MongooseServerSelectionError: unable to verify the first certificate
```

This error is often caused by [self-signed MongoDB certificates](https://medium.com/@rajanmaharjan/secure-your-mongodb-connections-ssl-tls-92e2addb3c89) or other situations where the certificate sent by the MongoDB
server is not registered with an established certificate authority. The solution is to set the `tlsCAFile` option, which essentially sets a list of allowed SSL certificates.

```javascript
await mongoose.connect('mongodb://127.0.0.1:27017/test', {
  tls: true,
  // For example, see https://medium.com/@rajanmaharjan/secure-your-mongodb-connections-ssl-tls-92e2addb3c89
  // for where the `rootCA.pem` file comes from.
  tlsCAFile: `${__dirname}/rootCA.pem`,
});
```

Another common issue is the below error message:

```no-highlight
MongooseServerSelectionError: Hostname/IP does not match certificate's altnames: Host: hostname1. is not cert's CN: hostname2
```

The SSL certificate's [common name](https://knowledge.digicert.com/solution/SO7239.html) **must** line up with the host name
in your connection string. If the SSL certificate is for `hostname2.mydomain.com`, your connection string must connect to `hostname2.mydomain.com`, not any other hostname or IP address that may be equivalent to `hostname2.mydomain.com`. For replica sets, this also means that the SSL certificate's common name must line up with the [machine's `hostname`](../connections.html#replicaset-hostnames). To disable this validation, set the `tlsAllowInvalidHostnames` option to `true`.

## X.509 Authentication

If you're using [X.509 authentication](https://www.mongodb.com/docs/drivers/node/current/fundamentals/authentication/mechanisms/#x.509), you should set the user name in the connection string, **not** the `connect()` options.

```javascript
// Do this:
const username = 'myusername';
await mongoose.connect(`mongodb://${encodeURIComponent(username)}@127.0.0.1:27017/test`, {
  tls: true,
  tlsCAFile: `${__dirname}/rootCA.pem`,
  authMechanism: 'MONGODB-X509',
});

// Not this:
await mongoose.connect('mongodb://127.0.0.1:27017/test', {
  tls: true,
  tlsCAFile: `${__dirname}/rootCA.pem`,
  authMechanism: 'MONGODB-X509',
  auth: { username },
});
```

## X.509 Authentication with MongoDB Atlas

With MongoDB Atlas, X.509 certificates are not Root CA certificates and will not work with the `tlsCAFile` parameter as self-signed certificates would. If the `tlsCAFile` parameter is used an error similar to the following would be raised:

```no-highlight
MongoServerSelectionError: unable to get local issuer certificate
```

To connect to a MongoDB Atlas cluster using X.509 authentication the correct option to set is `tlsCertificateKeyFile`. The connection string already specifies the `authSource` and `authMechanism`, however they're included below as `connect()` options for completeness:

```javascript
const url = 'mongodb+srv://xyz.mongodb.net/test?authSource=%24external&authMechanism=MONGODB-X509';
await mongoose.connect(url, {
  tls: true,
  // location of a local .pem file that contains both the client's certificate and key
  tlsCertificateKeyFile: '/path/to/certificate.pem',
  authMechanism: 'MONGODB-X509',
  authSource: '$external',
});
```

**Note** The connection string options must be URL escaped correctly.
