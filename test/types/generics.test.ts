import { Model, Document } from 'mongoose';

class Repository<T> {
  private readonly M: Model<T>;

  constructor(MM: Model<T>) {
    this.M = MM;
  }

  findById(id: string): Promise<T> {
    return this.M.findById(id).orFail().exec();
  }
}

class Foo {
  name: string;
}

type Test = Repository<Foo>;
