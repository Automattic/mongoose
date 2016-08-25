## Contributing to Mongoose

If you have a question about Mongoose (not a bug report) please post it to either [StackOverflow](http://stackoverflow.com/questions/tagged/mongoose), or on [Gitter](https://gitter.im/Automattic/mongoose?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### Reporting bugs

- Before opening a new issue, look for existing [issues](https://github.com/Automattic/mongoose/issues) to avoid duplication. If the issue does not yet exist, [create one](https://github.com/Automattic/mongoose/issues/new).
  - Please post any relevant code samples, preferably a standalone script that
  reproduces your issue. Do **not** describe your issue in prose, show your
  code.
  - If the bug involves an error, please post the stack trace.
  - Please post the version of mongoose and mongodb that you're using.
  - Please write bug reports in JavaScript (ES5 or ES2015), not coffeescript, typescript, etc.

### Requesting new features

- Before opening a new issue, look for existing [issues](https://github.com/learnboost/mongoose/issues) to avoid duplication. If the issue does not yet exist, [create one](https://github.com/learnboost/mongoose/issues/new).
- Please describe a use case for it
- it would be ideal to include test cases as well

### Fixing bugs / Adding features

- Before starting to write code, look for existing [issues](https://github.com/learnboost/mongoose/issues). That way you avoid working on something that might not be of interest or that has been addressed already in a different branch. You can create a new issue [here](https://github.com/learnboost/mongoose/issues/new).
  - _The source of this project is written in javascript, not coffeescript, therefore your bug reports should be written in javascript_.
- Fork the [repo](https://github.com/Automattic/mongoose) _or_ for small documentation changes, navigate to the source on github and click the [Edit](https://github.com/blog/844-forking-with-the-edit-button) button.
- Follow the general coding style of the rest of the project:
  - 2 space tabs
  - no trailing whitespace
  - inline documentation for new methods, class members, etc.
  - 1 space between conditionals, no space before function parenthesis
    - `if (..) {`
    - `for (..) {`
    - `while (..) {`
    - `function(err) {`
- Write tests and make sure they pass (tests are in the [test](https://github.com/Automattic/mongoose/tree/master/test) directory).

### Running the tests
- Open a terminal and navigate to the root of the project
- execute `npm install` to install the necessary dependencies
- start a mongodb instance on port 27017 if one isn't running already. `mongod --dbpath <path to store data> --port 27017`
- execute `npm test` to run the tests (we're using [mocha](http://mochajs.org/))
  - or to execute a single test `npm test -- -g 'some regexp that matches the test description'`
  - any mocha flags can be specified with `-- <mocha flags here>`
  - For example, you can use `npm test -- -R spec` to use the spec reporter, rather than the dot reporter (by default, the test output looks like a bunch of dots)

### Documentation

To contribute to the [API documentation](http://mongoosejs.com/docs/api.html) just make your changes to the inline documentation of the appropriate [source code](https://github.com/Automattic/mongoose/tree/master/lib) in the master branch and submit a [pull request](https://help.github.com/articles/using-pull-requests/). You might also use the github [Edit](https://github.com/blog/844-forking-with-the-edit-button) button.

To contribute to the [guide](http://mongoosejs.com/docs/guide.html) or [quick start](http://mongoosejs.com/docs/index.html) docs, make your changes to the appropriate `.jade` files in the [docs](https://github.com/Automattic/mongoose/tree/master/docs) directory of the master branch and submit a pull request. Again, the [Edit](https://github.com/blog/844-forking-with-the-edit-button) button might work for you here.

If you'd like to preview your documentation changes, first commit your changes to your local master branch, then execute `make docs` from the project root, which switches to the gh-pages branch, merges from the master branch and builds all the static pages for you. Now execute `node static.js` from the project root which will launch a local webserver where you can browse the documentation site locally. If all looks good, submit a [pull request](https://help.github.com/articles/using-pull-requests/) to the master branch with your changes.

### Plugins website

The [plugins](http://plugins.mongoosejs.io/) site is also an [open source project](https://github.com/vkarpov15/mongooseplugins) that you can get involved with. Feel free to fork and improve it as well!
