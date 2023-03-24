# Custom Casting

[Mongoose 5.4.0](https://github.com/Automattic/mongoose/blob/master/CHANGELOG.md#540--2018-12-14) introduced [several ways to configure SchemaTypes globally](http://thecodebarbarian.com/whats-new-in-mongoose-54-global-schematype-configuration).
One of these new features is the [`SchemaType.cast()` function](../api/schematype.html#schematype_SchemaType-cast), which enables you to override Mongoose's built-in casting.

For example, by default Mongoose will throw an error if you attempt to cast
a string that contains a Japanese numeral to a number.

```acquit
[require:custom casting.*casting error]
```

You can overwrite the default casting function for numbers to allow converting
the string that contains the Japanese numeral "2" to a number as shown below.

```acquit
[require:custom casting.*casting override]
```
