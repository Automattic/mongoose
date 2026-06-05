# Array

- [`MongooseArray.prototype.$pop()`](#MongooseArray.prototype.$pop())
- [`MongooseArray.prototype.$shift()`](#MongooseArray.prototype.$shift())
- [`MongooseArray.prototype.addToSet()`](#MongooseArray.prototype.addToSet())
- [`MongooseArray.prototype.clearAtomics()`](#MongooseArray.prototype.clearAtomics())
- [`MongooseArray.prototype.getAtomics()`](#MongooseArray.prototype.getAtomics())
- [`MongooseArray.prototype.includes()`](#MongooseArray.prototype.includes())
- [`MongooseArray.prototype.indexOf()`](#MongooseArray.prototype.indexOf())
- [`MongooseArray.prototype.inspect()`](#MongooseArray.prototype.inspect())
- [`MongooseArray.prototype.nonAtomicPush()`](#MongooseArray.prototype.nonAtomicPush())
- [`MongooseArray.prototype.pop()`](#MongooseArray.prototype.pop())
- [`MongooseArray.prototype.pull()`](#MongooseArray.prototype.pull())
- [`MongooseArray.prototype.push()`](#MongooseArray.prototype.push())
- [`MongooseArray.prototype.remove()`](#MongooseArray.prototype.remove())
- [`MongooseArray.prototype.set()`](#MongooseArray.prototype.set())
- [`MongooseArray.prototype.shift()`](#MongooseArray.prototype.shift())
- [`MongooseArray.prototype.sort()`](#MongooseArray.prototype.sort())
- [`MongooseArray.prototype.splice()`](#MongooseArray.prototype.splice())
- [`MongooseArray.prototype.toObject()`](#MongooseArray.prototype.toObject())
- [`MongooseArray.prototype.unshift()`](#MongooseArray.prototype.unshift())

## `MongooseArray.prototype.$pop()`

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/operator/update/pop/)

Pops the array atomically at most one time per document `save()`.

#### NOTE:

_Calling this multiple times on an array before saving sends the same command as calling it once._
_This update is implemented using the MongoDB [$pop](https://www.mongodb.com/docs/manual/reference/operator/update/pop/) method which enforces this restriction._

     doc.array = [1,2,3];

     const popped = doc.array.$pop();
     console.log(popped); // 3
     console.log(doc.array); // [1,2]

     // no affect
     popped = doc.array.$pop();
     console.log(doc.array); // [1,2]

     doc.save(function (err) {
       if (err) return handleError(err);

       // we saved, now $pop works again
       popped = doc.array.$pop();
       console.log(popped); // 2
       console.log(doc.array); // [1]
     })

## `MongooseArray.prototype.$shift()`

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/operator/update/pop/)

Atomically shifts the array at most one time per document `save()`.

#### Note:

_Calling this multiple times on an array before saving sends the same command as calling it once._
_This update is implemented using the MongoDB [$pop](https://www.mongodb.com/docs/manual/reference/operator/update/pop/) method which enforces this restriction._

     doc.array = [1,2,3];

     const shifted = doc.array.$shift();
     console.log(shifted); // 1
     console.log(doc.array); // [2,3]

     // no affect
     shifted = doc.array.$shift();
     console.log(doc.array); // [2,3]

     doc.save(function (err) {
       if (err) return handleError(err);

       // we saved, now $shift works again
       shifted = doc.array.$shift();
       console.log(shifted ); // 2
       console.log(doc.array); // [3]
     })

## `MongooseArray.prototype.addToSet()`

### Parameters

- `[...args]` \<any\>

### Returns

- \<Array\> the values that were added

Adds values to the array if not already present.

#### Example:

    console.log(doc.array) // [2,3,4]
    const added = doc.array.addToSet(4,5);
    console.log(doc.array) // [2,3,4,5]
    console.log(added)     // [5]

## `MongooseArray.prototype.clearAtomics()`

### Returns

- \<void,void\>

Clears all pending atomic operations. Called by Mongoose after save().

## `MongooseArray.prototype.getAtomics()`

### Returns

- \<Array\>

Public API for getting atomics. Alias for $__getAtomics() that can be
implemented by custom container types.

## `MongooseArray.prototype.includes()`

### Parameters

- `obj` \<object\> the item to check
- `fromIndex` \<number\>

### Returns

- \<boolean\>

Return whether or not the `obj` is included in the array.

## `MongooseArray.prototype.indexOf()`

### Parameters

- `obj` \<object\> the item to look for
- `fromIndex` \<number\>

### Returns

- \<number\>

Return the index of `obj` or `-1` if not found.

## `MongooseArray.prototype.inspect()`

Helper for console.log

## `MongooseArray.prototype.nonAtomicPush()`

### Parameters

- `[...args]` \<any\>

Pushes items to the array non-atomically.

#### Note:

_marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwriting any changes that happen between when you retrieved the object and when you save it._

## `MongooseArray.prototype.pop()`

### See

- [MongooseArray#$pop](https://mongoosejs.com/docs/api/array.md#MongooseArray.prototype.$pop())

Wraps [`Array#pop`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/pop) with proper change tracking.

#### Note:

_marks the entire array as modified which will pass the entire thing to $set potentially overwriting any changes that happen between when you retrieved the object and when you save it._

## `MongooseArray.prototype.pull()`

### Parameters

- `[...args]` \<any\>

### See

- [mongodb](https://www.mongodb.com/docs/manual/reference/operator/update/pull/)

Pulls items from the array atomically. Equality is determined by casting
the provided value to an embedded document and comparing using
[the `Document.equals()` function.](https://mongoosejs.com/docs/api/document.md#Document.prototype.equals())

#### Example:

    doc.array.pull(ObjectId)
    doc.array.pull({ _id: 'someId' })
    doc.array.pull(36)
    doc.array.pull('tag 1', 'tag 2')

To remove a document from a subdocument array we may pass an object with a matching `_id`.

    doc.subdocs.push({ _id: 4815162342 })
    doc.subdocs.pull({ _id: 4815162342 }) // removed

Or we may passing the _id directly and let mongoose take care of it.

    doc.subdocs.push({ _id: 4815162342 })
    doc.subdocs.pull(4815162342); // works

The first pull call will result in a atomic operation on the database, if pull is called repeatedly without saving the document, a $set operation is used on the complete array instead, overwriting possible changes that happened on the database in the meantime.

## `MongooseArray.prototype.push()`

### Parameters

- `[...args]` \<object\>

Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking.

#### Example:

    const schema = Schema({ nums: [Number] });
    const Model = mongoose.model('Test', schema);

    const doc = await Model.create({ nums: [3, 4] });
    doc.nums.push(5); // Add 5 to the end of the array
    await doc.save();

    // You can also pass an object with `$each` as the
    // first parameter to use MongoDB's `$position`
    doc.nums.push({
      $each: [1, 2],
      $position: 0
    });
    doc.nums; // [1, 2, 3, 4, 5]

## `MongooseArray.prototype.remove()`

### See

- [MongooseArray#pull](https://mongoosejs.com/docs/api/array.md#MongooseArray.prototype.pull())
- [mongodb](https://www.mongodb.com/docs/manual/reference/operator/update/pull/)

Alias of [pull](https://mongoosejs.com/docs/api/array.md#MongooseArray.prototype.pull())

## `MongooseArray.prototype.set()`

### Returns

- \<Array\> this

Sets the casted `val` at index `i` and marks the array modified.

#### Example:

    // given documents based on the following
    const Doc = mongoose.model('Doc', new Schema({ array: [Number] }));

    const doc = new Doc({ array: [2,3,4] })

    console.log(doc.array) // [2,3,4]

    doc.array.set(1,"5");
    console.log(doc.array); // [2,5,4] // properly cast to number
    doc.save() // the change is saved

    // VS not using array#set
    doc.array[1] = "5";
    console.log(doc.array); // [2,"5",4] // no casting
    doc.save() // change is not saved

## `MongooseArray.prototype.shift()`

Wraps [`Array#shift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.

#### Example:

    doc.array = [2,3];
    const res = doc.array.shift();
    console.log(res) // 2
    console.log(doc.array) // [3]

#### Note:

_marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwriting any changes that happen between when you retrieved the object and when you save it._

## `MongooseArray.prototype.sort()`

### See

- [MasteringJS: Array sort](https://masteringjs.io/tutorials/fundamentals/array-sort)

Wraps [`Array#sort`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/sort) with proper change tracking.

#### Note:

_marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwriting any changes that happen between when you retrieved the object and when you save it._

## `MongooseArray.prototype.splice()`

### See

- [MasteringJS: Array splice](https://masteringjs.io/tutorials/fundamentals/array-splice)

Wraps [`Array#splice`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice) with proper change tracking and casting.

#### Note:

_marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwriting any changes that happen between when you retrieved the object and when you save it._

## `MongooseArray.prototype.toObject()`

### Parameters

- `options` \<object\>

### Returns

- \<Array\>

Returns a native js Array.

## `MongooseArray.prototype.unshift()`

Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking.

#### Note:

_marks the entire array as modified, which if saved, will store it as a `$set` operation, potentially overwriting any changes that happen between when you retrieved the object and when you save it._
