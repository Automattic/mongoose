import { Model, Document } from 'mongoose';

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
