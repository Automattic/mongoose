'use strict';

const assert = require('assert');

require('../common');
const Schema = require('../../lib/schema');
const assignVals = require('../../lib/helpers/populate/assignVals');
const leanPopulateMap = require('../../lib/helpers/populate/leanPopulateMap');

describe('assignVals', function() {
  for (const justOne of [true, false]) {
    it(`ignores inherited $where in populate match with justOne=${justOne}`, function() {
      const path = justOne ? 'child' : 'children';
      const schema = new Schema({ child: String, children: [String] });
      const child = { _id: 'child1', active: true };
      const otherChild = { _id: 'child2', active: false };
      leanPopulateMap.set(child, {});
      leanPopulateMap.set(otherChild, {});
      const ids = justOne ? child._id : [child._id, otherChild._id];
      const doc = { [path]: ids };
      const match = Object.create({
        $where: '(() => { throw new Error("Inherited $where executed"); })()'
      });
      match.active = true;

      assignVals({
        docs: [doc],
        path,
        justOne,
        isVirtual: false,
        rawIds: [justOne ? ids : ids.slice()],
        allIds: [ids],
        rawDocs: { [child._id]: child, [otherChild._id]: otherChild },
        rawOrder: { [child._id]: 0, [otherChild._id]: 1 },
        match: [match],
        options: {},
        allOptions: { options: {} },
        originalModel: { schema }
      });

      assert.deepStrictEqual(doc[path], justOne ? child : [child]);
    });
  }
});
