const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({ first: String, last: String });
const testSchema = new mongoose.Schema({ items: [itemSchema] });
const Test = mongoose.model('Test', testSchema);

async function run() {
    await mongoose.connect('mongodb://localhost:27017/test14000');
    await mongoose.connection.dropDatabase();
  
    const entryId = new mongoose.Types.ObjectId();
    const firstItemId = new mongoose.Types.ObjectId();
    const entry = await Test.create({
      _id: entryId,
      items: [{ _id: firstItemId, last: 'Test', first: 'T' }],
    });
    console.log('entry', entry);
  
    // add 2nd item
    const secondItemId = new mongoose.Types.ObjectId();
    const item2 = { last: '222', first: '222', _id: secondItemId};

   const addToList = await Test.updateOne({ _id: entryId }, { $push: { items: item2 } });
   console.log(addToList, typeof(addToList))

   const list = await Test.findOne({_id: entryId})

   console.log(list)
  
    //edit
    const newItem = { _id: firstItemId, last: 'John', first: 'J' };
    console.log('newItem', newItem);
    const update = await Test.updateOne(
      { _id: entryId, 'items._id': firstItemId },
      { $setOnInsert: { 'items.$': newItem } },
    );
    console.log('update', update, typeof(update));
  
    const res = await Test.findOne({ _id: entryId });
    console.log('what is res', res);
    console.log('what is newItem', res?.items[0], typeof res?.items[0]);
    console.log('what is newItem', res?.items[1], typeof res?.items[1]);

    console.log(res?.items)
  }
  run()