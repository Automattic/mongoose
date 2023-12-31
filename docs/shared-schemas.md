# Sharing Schemas Between Mongoose Projects

In larger organizations, it is common to have a project that contains schemas which are shared between multiple projects.
For example, suppose your company has an `@initech/shared-schemas` private npm package, and `npm list` looks like the following:

```sh
@initech/web-app1@1.0.0
├── @initech/shared-schemas@1.0.0
├── mongoose@8.0.1
```

In the above output, `@initech/web-app1` is a *client project* and `@initech/shared-schemas` is the *shared library*.

## Put Mongoose as a Peer Dependency

First, and most importantly, we recommend that `@initech/shared-schemas` list Mongoose in [your shared-schema's `peerDependencies`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#peerdependencies), **not** as a top-level dependency.
For example, `@initech/shared-schemas`'s `package.json` should look like the following.

```javascript
{
  "name": "@initech/shared-schemas",
  "peerDependencies": {
    "mongoose": "8.x"
  }
}
```

We recommend this approach for the following reasons:

1. Easier to upgrade. For example, suppose `@initech/shared-schemas` has a dependency on Mongoose 8, and `@initech/web-app1` works fine with Mongoose 8; but `@initech/web-app2` cannot upgrade from Mongoose 7. Peer dependencies makes it easier for the projects that rely on your shared schemas to determine which version of Mongoose they want, without risking having conflicting versions of the Mongoose module.
2. Reduce risk of Mongoose module duplicates. Using Mongoose schemas and models from one version of Mongoose with another version is not supported.

## Export Schemas, Not Models

We recommend that `@initech/shared-schemas` export Mongoose schemas, **not** models.
This approach is more flexible and allows client projects to instantiate models using their preferred patterns.
In particular, if `@initech/shared-schemas` exports a model that is registered using `mongoose.model()`, there is no way to transfer that model to a different connection.

```javascript
// `userSchema.js` in `@initech/shared-schemas`
const userSchema = new mongoose.Schema({ name: String });

// Do this:
module.exports = userSchema;

// Not this:
module.exports = mongoose.model('User', userSchema);
```

## Workaround: Export a POJO

Sometimes, existing shared libraries don't follow the above best practices.
If you find yourself with a shared library that depends on an old version of Mongoose, a helpful workaround is to export a [POJO](https://masteringjs.io/tutorials/fundamentals/pojo) rather than a schema or model.
This will remove any conflicts between the shared library's version of Mongoose and the client project's version of Mongoose.

```javascript
// Replace this:
module.exports = new mongoose.Schema({ name: String });

// With this:
module.exports = { name: String };
```

And update your client project to do the following:

```javascript
// Replace this:
const { userSchema } = require('@initech/shared-schemas');

// With this:
const { userSchemaDefinition } = require('@initech/shared-schemas');
const userSchema = new mongoose.Schema(userSchemaDefinition);
```
