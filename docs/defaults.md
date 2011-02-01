
Defaults
========

Each `SchemaType` that you define (you can read more about them in the model
definition chapter) can have a default value.

Default values are applied when the document skeleton is constructed. This
means that if you create a new document (`new MyModel`) or if you find an
existing document (`MyModel.findById` for example), both will have defaults
provided that a certain key is missing.

## Definition

You can define a default with a function:

    new Schema({
        date: { type: Date, default: Date.now }
    })

or a value:

    new Schema({
        date: { type: Date, default: '12/10/1990' }
    })

Notice that defaults are automatically casted. In both cases, the defaults will
become actual `Date` objects, but we're passing a timestamp first, and a string
date second.
