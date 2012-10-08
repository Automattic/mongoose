## Contributing to Mongoose

### Bugfixes

- Before starting to write code, look for existing [tickets](https://github.com/learnboost/mongoose/issues) or [create one](https://github.com/learnboost/mongoose/issues/new) for your specific issue. That way you avoid working on something that might not be of interest or that has been addressed already in a different branch.
  - _The source of this project is written in javascript, not coffeescript, therefore your bug reports should be written with javascript too_. 
- Fork the [repo](https://github.com/learnboost/mongoose) _or_ for small documentation changes, navigate to the source on github and click the [Edit](https://github.com/blog/844-forking-with-the-edit-button) button.
- Follow the general coding style of the rest of the project:
  - 2 space tabs
  - no trailing whitespace
  - comma first
  - inline documentation for new methods, class members, etc
  - 1 space between conditionals/functions, and their parenthesis and curly braces
    - `if (..) {`
    - `for (..) {`
    - `while (..) {`
    - `function (err) {`
- Write tests and make sure they pass (execute `make test` from the cmd line to run the test suite).

### Documentation

To contribute to the [API documentation](http://mongoosejs.com/docs/api.html) just make your changes to the inline documentation of the appropriate [source code](https://github.com/LearnBoost/mongoose/tree/master/lib) in the master branch and submit a [pull request](https://help.github.com/articles/using-pull-requests/). You might also use the github [Edit](https://github.com/blog/844-forking-with-the-edit-button) button.

To contribute to the [guide](http://mongoosejs.com/docs/guide.html) or [quick start](http://mongoosejs.com/docs/index.html) docs, make your changes to the appropriate `.jade` files in the [docs](https://github.com/LearnBoost/mongoose/tree/master/docs) directory of the master branch and submit a pull request. Again, the [Edit](https://github.com/blog/844-forking-with-the-edit-button) button might work for you here.

If you'd like to preview your documentation changes, first commit your changes to your local master branch, then execute `make docs` from the project root, which switches to the gh-pages branch, merges from master, and builds all the static pages for you. Now execute `node server.js` from the project root which will launch a local webserver where you can browse the documentation site locally. If all looks good, submit a [pull request](https://help.github.com/articles/using-pull-requests/) to the master branch with your changes.

### Plugins website

The [plugins](http://plugins.mongoosejs.com/) site is also an [open source project](https://github.com/aheckmann/mongooseplugins) that you can get involved with. Feel free to fork and improve it as well!
