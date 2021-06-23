## Discriminators

### The `model.discriminator()` function

Discriminators are a schema inheritance mechanism. They enable
you to have multiple models with overlapping schemas on top of the
same underlying MongoDB collection.

Suppose you wanted to track different types of events in a single
collection. Every event will have a timestamp, but events that
represent clicked links should have a URL. You can achieve this
using the `model.discriminator()` function. This function takes
3 parameters, a model name, a discriminator schema and an optional
key (defaults to the model name). It returns a model whose schema
is the union of the base schema and the discriminator schema.

```javascript
const db = mongoose.createConnection('mongodb://localhost:27017/mongoose_test');
const eventSchema = new mongoose.Schema({ time: Date });
Event = db.model('_event', eventSchema);
ClickedLinkEvent = Event.discriminator('ClickedLink',
  new mongoose.Schema({ url: String }));
SignedUpEvent = Event.discriminator('SignedUp',
  new mongoose.Schema({ username: String }));
```

```javascript
[require:The model.discriminator()]
```

### Discriminators save to the Event model's collection

Suppose you created another discriminator to track events where
a new user registered. These `SignedUpEvent` instances will be
stored in the same collection as generic events and `ClickedLinkEvent`
instances.

```javascript
[require:Discriminators save to the Event model's collection]
```

### Discriminator keys

The way mongoose tells the difference between the different
discriminator models is by the 'discriminator key', which is
`__t` by default. Mongoose adds a String path called `__t`
to your schemas that it uses to track which discriminator
this document is an instance of.

```javascript
[require:Discriminator keys]
```