import { Schema, model, Document, Model, Types } from 'mongoose';
import { expectType, expectError } from 'tsd';


// Basic usage of `loadClass` with TypeScript
function basicLoadClassPattern() {
  class MyClass {
    myMethod() { return 42; }
    static myStatic() { return 42; }
    get myVirtual() { return 42; }
  }

  const schema = new Schema({ property1: String });
  schema.loadClass(MyClass);

  interface MySchema {
    property1: string;
  }


  // `loadClass()` does NOT update TS types automatically.
  // So we must manually combine schema fields + class members.
  type MyCombined = MySchema & MyClass;

  // The model type must include statics from the class
  type MyCombinedModel = Model<MyCombined> & typeof MyClass;

  // A document must combine Mongoose Document + class + schema
  type MyCombinedDocument = Document & MyCombined;

  // Cast schema to satisfy TypeScript
  const MyModel = model<MyCombinedDocument, MyCombinedModel>('MyClass', schema as any);

  // Static function should work
  expectType<number>(MyModel.myStatic());

  // Instance method should work
  const doc = new MyModel();
  expectType<number>(doc.myMethod());

  // Getter should work
  expectType<number>(doc.myVirtual);

  // Schema property should be typed
  expectType<string>(doc.property1);
}


// Using `this` typing in class methods

function thisParameterPattern() {
  interface MySchema {
    property1: string;
  }

  class MyClass {
    // Instance method typed with correct `this` type
    myMethod(this: MyCombinedDocument) {
      return this.property1;
    }

    // Static method typed with correct `this` type
    static myStatic(this: MyCombinedModel) {
      return 42;
    }


    // TypeScript does NOT allow `this` parameters in getters/setters.
    // So we show an example error here.
    get myVirtual() {
      expectError(this.property1);
      // @ts-expect-error: getter does not support `this` typing
      return this.property1;
    }
  }

  const schema = new Schema<MySchema>({ property1: String });
  schema.loadClass(MyClass);

  type MyCombined = MySchema & MyClass;
  type MyCombinedModel = Model<MyCombined> & typeof MyClass;
  type MyCombinedDocument = Document & MyCombined;

  const MyModel = model<MyCombinedDocument, MyCombinedModel>('MyClass2', schema as any);

  // Test static
  expectType<number>(MyModel.myStatic());

  const doc = new MyModel({ property1: 'test' });

  // Instance method returns string
  expectType<string>(doc.myMethod());

  // Schema field is typed correctly
  expectType<string>(doc.property1);


  // Getter works at runtime, but TypeScript can't type `this` in getters.
  // So we accept `any`.
  const virtual = doc.myVirtual;
  expectType<any>(virtual);
}


// ----------------------------------------------------------
// Test that `toObject()` / `toJSON()` lose class behavior.
// But TypeScript does NOT warn you about this.
//
// This matches the behavior described in issue #12813:
// > doc.toObject().myMethod() compiles but fails at runtime
// ----------------------------------------------------------
function toObjectToJSONTest() {
  class MyClass {
    myMethod() { return 42; }
    static myStatic() { return 42; }
    get myVirtual() { return 42; }
  }

  const schema = new Schema({ property1: String });
  schema.loadClass(MyClass);

  interface MySchema {
    property1: string;
  }

  type MyCombined = MySchema & MyClass;
  type MyCombinedModel = Model<MyCombined> & typeof MyClass;
  type MyCombinedDocument = Document & MyCombined;

  const MyModel = model<MyCombinedDocument, MyCombinedModel>('MyClass3', schema as any);

  const doc = new MyModel({ property1: 'test' });


  // toObject():
  //  returns plain object
  //  loses methods at runtime
  //  TypeScript still thinks methods exist
  const pojo = doc.toObject();

  // Schema property is still typed
  expectType<string>(pojo.property1);

  // TS still thinks class method exists (wrong at runtime)
  expectType<() => number>(pojo.myMethod);

  // Same caveat applies to toJSON()
  const json = doc.toJSON();

  expectType<() => number>(json.myMethod);
  expectType<string>(json.property1);
}


// Getter limitation example
// TypeScript does not allow `this` param on getters

function getterLimitationTest() {
  interface MySchema {
    name: string;
  }

  class TestGetter {
    name: string;

    // TS errors if you try `this` in getter
    // @ts-expect-error TS2784: 'this' parameters are not allowed in getters
    get test(this: TestDoc): string {
      return this.name;
    }
  }

  interface TestDoc extends TestGetter, Omit<Document, '_id'> {
    _id: Types.ObjectId;
  }
}

