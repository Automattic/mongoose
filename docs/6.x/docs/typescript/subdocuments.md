# Handling Subdocuments in TypeScript

Subdocuments are tricky in TypeScript.
By default, Mongoose treats object properties in document interfaces as _nested properties_ rather than subdocuments.

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
The 3rd generic param to the `Model<>` is called `TMethodsAndOverrides`: originally it was just used to define methods, but you can also use it to override types as shown below.

```ts
// Define property overrides for hydrated documents
type UserDocumentOverrides = {
  names: Types.Subdocument<Types.ObjectId> & Names;
};
type UserModelType = Model<User, {}, UserDocumentOverrides>;

const userSchema = new Schema<User, UserModelType>({
  names: new Schema<Names>({ firstName: String })
});
const UserModel = model<User, UserModelType>('User', userSchema);


const doc = new UserModel({ names: { _id: '0'.repeat(24), firstName: 'foo' } });
doc.names.ownerDocument(); // Works, `names` is a subdocument!
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
type UserDocumentProps = {
  names: Types.DocumentArray<Names>;
};
type UserModelType = Model<User, {}, UserDocumentProps>;

// Create model
const UserModel = model<User, UserModelType>('User', new Schema<User, UserModelType>({
  names: [new Schema<Names>({ firstName: String })]
}));

const doc = new UserModel({});
doc.names[0].ownerDocument(); // Works!
```
