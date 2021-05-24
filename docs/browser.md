# Mongoose in the Browser

Mongoose supports creating schemas and validating documents in the browser.
Mongoose's browser library does **not** support saving documents, [queries](http://mongoosejs.com/docs/queries.html), [populate](http://mongoosejs.com/docs/populate.html), [discriminators](http://mongoosejs.com/docs/discriminators.html), or any other Mongoose feature other than schemas and validating documents.

Mongoose has a pre-built bundle of the browser library. If you're bundling your code with [Webpack](https://webpack.js.org/), you should be able to import Mongoose's browser library as shown below if your Webpack `target` is `'web'`:

```javascript
import mongoose from 'mongoose';
```

You can use the below syntax to access the Mongoose browser library from Node.js:

```javascript
// Using `require()`
const mongoose = require('mongoose/browser');

// Using ES6 imports
import mongoose from 'mongoose/browser';
```

<h2 id="usage">Using the Browser Library</h2>

Mongoose's browser library is very limited. The only use case it supports is validating documents as shown below.

```javascript
import mongoose from 'mongoose';

// Mongoose's browser library does **not** have models. It only supports
// schemas and documents. The primary use case is validating documents
// against Mongoose schemas.
const doc = new mongoose.Document({}, new mongoose.Schema({
  name: { type: String, required: true }
}));
// Prints an error because `name` is required.
console.log(doc.validateSync());
```