import { Model, Document, Types, HydratedDocument, FilterQuery } from 'mongoose';
import { expectAssignable, expectNotAssignable } from 'tsd';

class Repository<T> {
  private readonly Model: Model<T & Document>;

  findById(id: string): Promise<T & Document> {
    return Model.findById(id).exec();
  }
}

class Foo {
  name: string;
}

type Test = Repository<Foo>;

interface CommonInterface<T> {
  _id: Types.ObjectId;
  something: string;
  content: T;
}
type CommonInterfaceDoc = HydratedDocument<CommonInterface<string>>;

async function findSomething<T>(model: Model<CommonInterface<T>>) {
  const q: FilterQuery<CommonInterface<any>> = {};

  expectAssignable<typeof q._id>(new Types.ObjectId());
  expectAssignable<typeof q._id>('6255d1344a19abe27d90a8b8');

  return model.findOne({ something: 'test' }) // <= causes error listed below
    .exec();
}

async function findSomething2<T extends Model<CommonInterface<any>>>(model: T) {
  const q: FilterQuery<CommonInterface<any>> = {};

  // These would work if types were enabled for FilterQuery, but currently they are all | any
  // let a: typeof q.something;
  // expectAssignable<typeof q.something>('');
  // expectAssignable<typeof q.something>(['', '']);
  // expectNotAssignable<typeof q.something>(1);
  // expectNotAssignable<typeof q.something>([1, 2, 3]);
  // expectNotAssignable<typeof q.something>(true);
  // expectNotAssignable<typeof q.something>(new Types.ObjectId());

  expectAssignable<typeof q._id>(new Types.ObjectId());
  expectAssignable<typeof q._id>('6255d1344a19abe27d90a8b8');

  // FilterQuery works properly with this version because it can intuit the type
  // more accurately, so type hints for e.g. something, content, etc work

  return model.findOne({ something: 'test' }) // <= causes error listed below
    .exec();
}

