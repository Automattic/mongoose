import { Schema, model, Document, Model, Types } from 'mongoose';

interface ITest {
  map1: Map<string, number>,
  map2: Map<string, string>,
  map3: Map<string, number>
}

const schema: Schema = new Schema<ITest>({
  map1: {
    type: Map,
    of: Number
  },
  map2: {
    type: Map,
    of: { type: String, enum: ['hello, world'] }
  },
  map3: {
    type: Map,
    of: {
      type: Number,
      max: 44
    }
  }
});

const Test = model<ITest>('Test', schema);

const doc: ITest = new Test({});

doc.map1.set('answer', 42);
doc.map1.get('answer');

function gh10575() {
  interface IBase {
    _id: Types.ObjectId;
    id: string;

    prop1: string;
    prop2: string;
  }

  interface IModel1 extends IBase {
    property1: number;
    property2: number;
  }

  interface IModel2 extends IBase {
    property3: string;
  }

  const BaseSchema: Schema<IBase> = new Schema({ prop1: String, prop2: String });

  const Model1Schema: Schema<IModel1> = BaseSchema.clone() as any;
  Model1Schema.add({ property1: Number, property2: Number });

  const Model2Schema: Schema<IModel2> = BaseSchema.clone() as any;
  Model2Schema.add({ property3: String });

  const Model1 = model<IModel1, Model<IModel1>>('m1', Model1Schema);
  const Model2 = model<IModel2, Model<IModel2>>('m2', Model2Schema);

  const someMap: Map<string, Model<IBase>> = new Map();
  // Add `as any` to work around errors in strict mode
  someMap.set('A', Model1 as any);
  someMap.set('B', Model2 as any);
}

function gh10872(): void {
  const doc = new Test({});

  doc.toJSON().map1.foo;
}
