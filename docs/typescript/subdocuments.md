# Handling Subdocuments in TypeScript

Subdocuments are tricky in TypeScript.
By default, Mongoose treats object properties in document interfaces as *nested properties* rather than subdocuments.

```ts
// Setup
import { Schema, Types, model, Model } from 'mongoose';

// Subdocument definition
interface Names {
  _id: Types.ObjectId;
  firstName: string;
}

// Document definition
interface User {
  names: Names;
}

// Models and schemas
type UserModelType = Model<User>;
const userSchema = new Schema<User, UserModelType>({
  names: new Schema<Names>({ firstName: String })
});
const UserModel = model<User, UserModelType>('User', userSchema);

// Create a new document:
const doc = new UserModel({ names: { _id: '0'.repeat(24), firstName: 'foo' } });

// "Property 'ownerDocument' does not exist on type 'Names'."
// Means that `doc.names` is not a subdocument!
doc.names.ownerDocument();
```

Mongoose provides a mechanism to override types in the hydrated document.
Define a separate `THydratedDocumentType` and pass it as the 5th generic param to `mongoose.Model<>`.
`THydratedDocumentType` controls what type Mongoose uses for "hydrated documents", that is, what `await UserModel.findOne()`, `UserModel.hydrate()`, and `new UserModel()` return.

```ts
import { HydratedSingleSubdocument } from 'mongoose';

// Define property overrides for hydrated documents
type THydratedUserDocument = {
  names?: HydratedSingleSubdocument<Names>
}
type UserModelType = mongoose.Model<User, {}, {}, {}, THydratedUserDocument>;

const userSchema = new mongoose.Schema<User, UserModelType>({
  names: new mongoose.Schema<Names>({ firstName: String })
});
const UserModel = mongoose.model<User, UserModelType>('User', userSchema);

const doc = new UserModel({ names: { _id: '0'.repeat(24), firstName: 'foo' } });
doc.names!.ownerDocument(); // Works, `names` is a subdocument!
doc.names!.firstName; // 'foo'
```

## Subdocument Arrays

You can also override arrays to properly type subdocument arrays using `TMethodsAndOverrides`:

```ts
// Subdocument definition
interface Names {
  _id: Types.ObjectId;
  firstName: string;
}
// Document definition
interface User {
  names: Names[];
}

// TMethodsAndOverrides
type THydratedUserDocument = {
  names?: Types.DocumentArray<Names>
}
type UserModelType = Model<User, {}, {}, {}, THydratedUserDocument>;

// Create model
const UserModel = model<User, UserModelType>('User', new Schema<User, UserModelType>({
  names: [new Schema<Names>({ firstName: String })]
}));

const doc = new UserModel({});
doc.names[0].ownerDocument(); // Works!
doc.names[0].firstName; // string
```
