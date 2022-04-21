import { Document, Model, Schema, model } from 'mongoose';

interface IPerson {
  _id: number;
  firstName: string;
  lastName: string;

  fullName: string;
}

interface IPet {
  name: string;
  isDeleted: boolean;
  ownerId: number;

  owner: IPerson;
}

const personSchema = new Schema<IPerson & Document, Model<IPerson & Document>, IPerson>({
  _id: { type: Number, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true }
});

const petSchema = new Schema<IPet & Document, Model<IPet & Document>, IPet>({
  name: { type: String, required: true },
  ownerId: { type: Number, required: true },
  isDeleted: { type: Boolean, default: false }
});

// Virtual getters and setters
personSchema.virtual('fullName')
  .get(function(this: IPerson, value, virtual, doc) {
    return `${this.firstName} ${this.lastName}`;
  })
  .set(function(this: IPerson, value, virtual, doc) {
    const splittedName = value.split(' ');
    this.firstName = splittedName[0];
    this.lastName = splittedName[1];
  });

personSchema.virtual('fullNameAlt')
  .get(function() {
    return `${this.firstName} ${this.lastName}`;
  })
  .set(function(value) {
    const splittedName = value.split(' ');
    this.firstName = splittedName[0];
    this.lastName = splittedName[1];
  });

// Populated virtuals
petSchema.virtual('owner', {
  ref: 'Person',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
  autopopulate: true,
  options: {
    match: { isDeleted: false }
  }
});

const Person = model<IPerson>('Person', personSchema);
const Pet = model<IPet>('Pet', petSchema);

(async() => {
  const person = await Person.create({ _id: 1, firstName: 'John', lastName: 'Wick' });
  await Pet.create({ name: 'Andy', ownerId: person._id });

  const pet = await Pet.findOne().orFail().populate('owner');
  console.log(pet.owner.fullName); // John Wick
})();
