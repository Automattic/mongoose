# How to Check Your Mongoose Version

To check what version of Mongoose you are using in Node.js, print out the [`mongoose.version` property](./api/mongoose.html#Mongoose.prototype.version) as follows.

```javascript
const mongoose = require('mongoose');

console.log(mongoose.version); // '7.x.x'
```

We recommend printing the Mongoose version from Node.js, because that better handles cases where you have multiple versions of Mongoose installed.
You can also execute the above logic from your terminal using Node.js' `-e` flag as follows.

```
# Prints current Mongoose version, e.g. 7.0.3
node -e "console.log(require('mongoose').version)"
```

## Using `npm list`

You can also [get the installed version of the Mongoose npm package](https://masteringjs.io/tutorials/npm/version) using `npm list`.

```
$ npm list mongoose
test@ /path/to/test
└── mongoose@7.0.3 
```

`npm list` is helpful because it can identify if you have multiple versions of Mongoose installed.

Other package managers also support similar functions:

- [`yarn list --pattern "mongoose"`](https://classic.yarnpkg.com/lang/en/docs/cli/list/)
- [`pnpm list "mongoose"`](https://pnpm.io/cli/list)
