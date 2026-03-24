### Problem Explanation
Subclassing a model currently allows calling `mongoose.model()` (or `connection.model()`) with an existing model name but a different collection name. This behavior:
1. Returns a model that is **not** registered in Mongoose's `models` registry (a "dangling model").
2. Relies on internal API (`Model.__subclass()`) which is undocumented and confusing.
3. Leads to implicit side effects and potential tracking issues, as these models are not easily accessible from the connection.

### Chosen Solution and Reasoning
We chose to **deprecate** `Model.__subclass()` and the associated behavior in the `model()` factory methods. 
- **Reasoning**: Maintaining multiple models with the same name on a single connection is inconsistent with Mongoose's core registry design. By deprecating this behavior, we encourage developers to use more explicit and maintainable patterns like `schema.clone()` with a unique model name or using discriminators.
- **Backward Compatibility**: Existing code will continue to function but will emit a warning, providing a clear path for migration without breaking existing applications.

### Changes
- **lib/model.js**: Added deprecation warning and JSDoc tag to `Model.__subclass()`.
- **lib/mongoose.js**: Added warning in `Mongoose.prototype.model()` when collection name mismatch creates a dangling model.
- **lib/connection.js**: Added warning in `Connection.prototype.model()` for the same dangling model scenario.
- **test/gh7547.test.js**: New test file validating that warnings are emitted as expected.

### Migration Guidance
Instead of creating a dangling model with the same name:
```javascript
const User = mongoose.model('User', schema);
const OtherUser = mongoose.model('User', 'other_users'); // Deprecated: triggers dangling model
```
Please use a unique name for the new model/collection pair:
```javascript
const User = mongoose.model('User', schema);
const OtherUser = mongoose.model('OtherUser', User.schema, 'other_users'); // Recommended
```

Fixes #7547
