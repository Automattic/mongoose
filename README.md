Mongoose 1.0
============

## TODO List

    [x] Partial updates
    [x] Atomic operations on embedded arrays
    [ ] Atomicity through update-if-present
    [x] Better connection model
    [x] Mongoose Class
    [ ] Query/Promise abstractions
    [x] Subdocument operations
    [ ] Async validation
    [x] Async defaults
    [x] Custom types
    [x] Plugins
        [x] Nodestream
        [ ] Compatibility plugin
    [-] Query casting
        [x] Path-based querying machinery
        [ ] Writer compilation casting
    [ ] Tests
        [ ] Tests from Mongoose 0.x
        [ ] Tests from Mongoose 1
        [ ] New tests

## Improvements over old Mongoose

    [x] NPM and git submodule friendly directory structure
    [x] Nemoved the use of `require.paths`
    [x] Leveraged `module.exports`
    [x] Support for safe mode
    [x] Built-in support for timeouts for safety
    [x] Clean error handling through the familiar `err, callback` signature.
    [x] Seamless support for promises and callback parameters, with 
    [x] Access to mongodb has been separated into driver adaptors.
