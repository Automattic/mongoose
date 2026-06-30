import { Schema, model } from 'mongoose';
import { expect, test } from 'tstyche';

interface IUser {
  name: string;
  email: string;
  age: number;
}

const User = model<IUser>('NamedParamsUser', new Schema<IUser>({ name: String, email: String, age: Number }));

test('findOne named parameters: valid forms compile', () => {
  // positional style still works
  expect(User.findOne({ name: 'John' })).type.not.toRaiseError();
  // named params: $filter required, $projection / $options optional
  expect(User.findOne({ $filter: { name: 'John' } })).type.not.toRaiseError();
  expect(User.findOne({ $filter: { name: 'John' }, $projection: 'name age' })).type.not.toRaiseError();
  expect(User.findOne({ $filter: { name: 'John' }, $projection: { name: 1 }, $options: { lean: true } })).type.not.toRaiseError();
  // options-only via the `$filter: null` escape hatch
  expect(User.findOne({ $filter: null, $options: { lean: true } })).type.not.toRaiseError();
});

test('findOne named parameters: malformed forms are rejected', () => {
  // unknown sentinel-style key
  expect(User.findOne({ $filter: { name: 'John' }, $bogus: 1 })).type.toRaiseError();
  // $filter is required in the named-params form
  expect(User.findOne({ $projection: 'name' })).type.toRaiseError();
  expect(User.findOne({ $options: { lean: true } })).type.toRaiseError();
});
