## Model.update

Updates all documents matching `conditions` using the `update` clause. All `update` values are casted to their appropriate types before being sent.

    var conditions = { name: 'borne' }
      , update = { $inc: { visits: 1 }}
      , options = { multi: true };

    Model.update(conditions, update, options, callback);

    function callback (err, numAffected) {
      // numAffected is the number of updated documents
    })

Keep in mind that that the `safe` option specified in your schema is used by default when not specified here.

Note: for backwards compatibility, all top-level `update` keys that are not $atomic operation names are treated as `$set` operations. Example:

    var query = { name: 'borne' };
    Model.update(query, { name: 'jason borne' }, options, callback)

    // is sent as

    Model.update(query, { $set: { name: 'jason borne' }}, options, callback)

This helps prevent accidentally overwriting all of your document(s) with `{ name: 'jason borne' }`.

Also note: although values are casted to their appropriate types when using `update`, the following are **not** applied:

- defaults
- setters
- validators
- middleware triggered on `save`

If you want those features, please use the following convention rather than `update`:

    Model.findOne({ name: 'borne' }, function (err, doc){
      doc.name = 'jason borne';
      doc.visits.$inc();
      doc.save();
    });