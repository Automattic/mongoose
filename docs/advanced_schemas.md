# Advanced Schemas

## Creating from ES6 Classes Using `loadClass()`

Mongoose allows creating schemas from [ES6 classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes).
The `loadClass()` function lets you pull in methods,
statics, and virtuals from an ES6 class. A class method maps to a schema
method, a static method maps to a schema static, and getters/setters map
to virtuals.

```acquit
[require:Creating from ES6 Classes Using `loadClass\(\)`]
```
