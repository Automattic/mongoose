# Map

- [`MongooseMap.prototype.$isMongooseMap`](#MongooseMap.prototype.$isMongooseMap)
- [`MongooseMap.prototype.clear()`](#MongooseMap.prototype.clear())
- [`MongooseMap.prototype.delete()`](#MongooseMap.prototype.delete())
- [`MongooseMap.prototype.get()`](#MongooseMap.prototype.get())
- [`MongooseMap.prototype.set()`](#MongooseMap.prototype.set())
- [`MongooseMap.prototype.toBSON()`](#MongooseMap.prototype.toBSON())
- [`MongooseMap.prototype.toJSON()`](#MongooseMap.prototype.toJSON())

## `MongooseMap.prototype.$isMongooseMap`

### Type

- \<property\>

Set to `true` for all Mongoose map instances

## `MongooseMap.prototype.clear()`

Overwrites native Map's `clear()` function to support change tracking.

## `MongooseMap.prototype.delete()`

Overwrites native Map's `delete()` function to support change tracking.

## `MongooseMap.prototype.get()`

Overwrites native Map's `get()` function to support Mongoose getters.

## `MongooseMap.prototype.set()`

Overwrites native Map's `set()` function to support setters, `populate()`,
and change tracking. Note that Mongoose maps _only_ support strings and
ObjectIds as keys.

Keys also cannot:
- be named after special properties `prototype`, `constructor`, and `__proto__`
- start with a dollar sign (`$`)
- contain any dots (`.`)

#### Example:

    doc.myMap.set('test', 42); // works
    doc.myMap.set({ obj: 42 }, 42); // Throws "Mongoose maps only support string keys"
    doc.myMap.set(10, 42); // Throws "Mongoose maps only support string keys"
    doc.myMap.set("$test", 42); // Throws "Mongoose maps do not support keys that start with "$", got "$test""

## `MongooseMap.prototype.toBSON()`

Converts this map to a native JavaScript Map so the MongoDB driver can serialize it.

## `MongooseMap.prototype.toJSON()`

### Parameters

- `[options]` \<object\>
- `[options.flattenMaps=false]` \<boolean\> set to `true` to convert the map to a POJO rather than a native JavaScript map

Converts this map to a native JavaScript Map for `JSON.stringify()`. Set
the `flattenMaps` option to convert this map to a POJO instead.

#### Example:

    doc.myMap.toJSON() instanceof Map; // true
    doc.myMap.toJSON({ flattenMaps: true }) instanceof Map; // false
