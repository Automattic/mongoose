# Working With Dates

Here's how you declare a path of type `Date` with a Mongoose schema:

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  // `lastActiveAt` is a date
  lastActiveAt: Date
});
const User = mongoose.model('User', userSchema);
```

When you create a user [document](../documents.html), Mongoose will cast
the value to a [native JavaScript date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
using the [`Date()` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#Syntax).

```acquit
[require:Date Tutorial.*Example 1.2]
```

An invalid date will lead to a `CastError` when you [validate the document](../validation.html).

```acquit
[require:Date Tutorial.*Example 1.3]
```

## Validators

Dates have two built-in validators: `min` and `max`. These validators will
report a `ValidatorError` if the given date is strictly less than `min` or
strictly greater than `max`.

```acquit
[require:Date Tutorial.*Example 1.2.1]
```

## Querying

MongoDB supports querying by date ranges and sorting by dates. Here's some
examples of querying by dates, date ranges, and sorting by date:

```acquit
[require:Date Tutorial.*Example 1.3.1]
```

## Casting Edge Cases

Date casting has a couple small cases where it differs from JavaScript's 
native date parsing. First, Mongoose looks for a [`valueOf()` function](https://www.w3schools.com/jsref/jsref_valueof_string.asp) on the given object,
and calls `valueOf()` before casting the date. This means Mongoose can cast
[moment objects](http://npmjs.com/package/moment) to dates automatically.

```acquit
[require:Date Tutorial.*Example 1.4.1]
```

By default, if you pass a numeric
string to the Date constructor, JavaScript will attempt to convert it to a
year.

```javascript
new Date(1552261496289); // "2019-03-10T23:44:56.289Z"
new Date('1552261496289'); // "Invalid Date"
new Date('2010'); // 2010-01-01T00:00:00.000Z
```

Mongoose converts numeric strings that contain numbers outside the [range of representable dates in JavaScript](https://stackoverflow.com/questions/11526504/minimum-and-maximum-date) and converts them to numbers before passing them to the date constructor.

```acquit
[require: Date Tutorial.*Example 1.4.3]
```

## Timezones

[MongoDB stores dates as 64-bit integers](http://bsonspec.org/spec.html), which
means that Mongoose does **not** store timezone information by default. When
you call `Date#toString()`, the JavaScript runtime will use [your OS' timezone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset).
