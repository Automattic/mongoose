# SSL Connections

Mongoose supports connecting to [MongoDB clusters that require SSL connections](https://www.mongodb.com/docs/manual/tutorial/configure-ssl/). Setting the `ssl` option to `true` in [`mongoose.connect()`](../api/mongoose.html#mongoose_Mongoose-connect) or your connection string is enough to connect to a MongoDB cluster using SSL:

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/test', { ssl: true });

// Equivalent:
mongoose.connect('mongodb://127.0.0.1:27017/test?ssl=true');
```

The `ssl` option defaults to `false` for connection strings that start with `mongodb://`. However,
the `ssl` option defaults to `true` for connection strings that start with `mongodb+srv://`. So if you are using an srv connection string to connect to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), SSL is enabled by default.

If you try to connect to a MongoDB cluster that requires SSL without enabling the `ssl` option, `mongoose.connect()`
will error out with the below error:

```no-highlight
MongooseServerSelectionError: connection <monitor> to 127.0.0.1:27017 closed
    at NativeConnection.Connection.openUri (/node_modules/mongoose/lib/connection.js:800:32)
    ...
```

## SSL Validation

By default, Mongoose validates the SSL certificate against a [certificate authority](https://en.wikipedia.org/wiki/Certificate_authority) to ensure the SSL certificate is valid. To disable this validation, set the `sslValidate` option
to `false`.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/test', {
  ssl: true,
  sslValidate: false
});
```

In most cases, you should not disable SSL validation in production. However, `sslValidate: false` is often helpful
for debugging SSL connection issues. If you can connect to MongoDB with `sslValidate: false`, but not with
`sslValidate: true`, then you can confirm Mongoose can connect to the server and the server is configured to use
SSL correctly, but there's some issue with the SSL certificate.

For example, a common issue is the below error message:

```no-highlight
MongooseServerSelectionError: unable to verify the first certificate
```

This error is often caused by [self-signed MongoDB certificates](https://medium.com/@rajanmaharjan/secure-your-mongodb-connections-ssl-tls-92e2addb3c89) or other situations where the certificate sent by the MongoDB
server is not registered with an established certificate authority. The solution is to set the `sslCA` option, which essentially sets a list of allowed SSL certificates.

```javascript
await mongoose.connect('mongodb://127.0.0.1:27017/test', {
  ssl: true,
  sslValidate: true,
  // For example, see https://medium.com/@rajanmaharjan/secure-your-mongodb-connections-ssl-tls-92e2addb3c89
  // for where the `rootCA.pem` file comes from.
  // Please note that, in Mongoose >= 5.8.3, `sslCA` needs to be
  // the **path to** the CA file, **not** the contents of the CA file
  sslCA: `${__dirname}/rootCA.pem`
});
```

Another common issue is the below error message:

```no-highlight
MongooseServerSelectionError: Hostname/IP does not match certificate's altnames: Host: hostname1. is not cert's CN: hostname2
```

The SSL certificate's [common name](https://knowledge.digicert.com/solution/SO7239.html) **must** line up with the host name
in your connection string. If the SSL certificate is for `hostname2.mydomain.com`, your connection string must connect to `hostname2.mydomain.com`, not any other hostname or IP address that may be equivalent to `hostname2.mydomain.com`. For replica sets, this also means that the SSL certificate's common name must line up with the [machine's `hostname`](../connections.html#replicaset-hostnames).

## X509 Auth

If you're using [X509 authentication](https://www.mongodb.com/docs/drivers/node/current/fundamentals/authentication/mechanisms/#x.509), you should set the user name in the connection string, **not** the `connect()` options.

```javascript
// Do this:
const username = 'myusername';
await mongoose.connect(`mongodb://${encodeURIComponent(username)}@127.0.0.1:27017/test`, {
  ssl: true,
  sslValidate: true,
  sslCA: `${__dirname}/rootCA.pem`,
  authMechanism: 'MONGODB-X509'
});

// Not this:
await mongoose.connect('mongodb://127.0.0.1:27017/test', {
  ssl: true,
  sslValidate: true,
  sslCA: `${__dirname}/rootCA.pem`,
  authMechanism: 'MONGODB-X509',
  auth: { username }
});
```
