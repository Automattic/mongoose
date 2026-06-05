# ArraySubdocument

- [`ArraySubdocument.prototype.$parent()`](#ArraySubdocument.prototype.$parent())
- [`ArraySubdocument.prototype.parentArray()`](#ArraySubdocument.prototype.parentArray())

## `ArraySubdocument.prototype.$parent()`

Returns this sub-documents parent document.

## `ArraySubdocument.prototype.parentArray()`

Returns this subdocument's parent array.

#### Example:

    const Test = mongoose.model('Test', new Schema({
      docArr: [{ name: String }]
    }));
    const doc = new Test({ docArr: [{ name: 'test subdoc' }] });

    doc.docArr[0].parentArray() === doc.docArr; // true
