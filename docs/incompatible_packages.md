The following npm packages are known to be incompatible with Mongoose:

- [collections](https://www.npmjs.com/package/collections): polluted globals cause issues with the MongoDB Node driver's URL parser. See [GitHub issue 12671](https://github.com/Automattic/mongoose/issues/12671#issuecomment-1374942680). This affects any [package that depends on collections](https://www.npmjs.com/package/collections?activeTab=dependents).
- [excel-export](https://www.npmjs.com/package/excel-export): has dependency on `collections`