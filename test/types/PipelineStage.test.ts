import { ObjectId } from 'mongodb';
import type { PipelineStage } from 'mongoose';
import { expectError, expectType } from 'tsd';

/**
 * $addFields:
 *
 * @see https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/
 */
const addFields1: PipelineStage = {
  $addFields: {
    totalHomework: { $sum: '$homework' },
    totalQuiz: { $sum: '$quiz' }
  }
};

const addFields2: PipelineStage = {
  $addFields: {
    totalScore:
      { $add: ['$totalHomework', '$totalQuiz', '$extraCredit'] }
  }
};

const addFields3: PipelineStage = {
  $addFields: {
    'specs.fuel_type': 'unleaded'
  }
};

const addFields4: PipelineStage = {
  $addFields: { cats: 20 }
};

const addFields5: PipelineStage = {
  $addFields: {
    _id: '$item',
    item: 'fruit'
  }
};

const addFields6: PipelineStage = {
  $addFields: { homework: { $concatArrays: ['$homework', [7]] } }
};

/**
 * $bucket
 *
 * @see https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
 */

const bucket1: PipelineStage = {
  $bucket: {
    groupBy: '$year_born', // Field to group by
    boundaries: [1840, 1850, 1860, 1870, 1880], // Boundaries for the buckets
    default: 'Other', // Bucket id for documents which do not fall into a bucket
    output: { // Output for each bucket
      count: { $sum: 1 },
      artists:
      {
        $push: {
          name: { $concat: ['$first_name', ' ', '$last_name'] },
          year_born: '$year_born'
        }
      }
    }
  }
};

const bucket2: PipelineStage = {
  $facet: { // Top-level $facet stage
    price: [ // Output field 1
      {
        $bucket: {
          groupBy: '$price', // Field to group by
          boundaries: [0, 200, 400], // Boundaries for the buckets
          default: 'Other', // Bucket id for documents which do not fall into a bucket
          output: { // Output for each bucket
            count: { $sum: 1 },
            artwork: { $push: { title: '$title', price: '$price' } },
            averagePrice: { $avg: '$price' }
          }
        }
      }
    ],
    year: [ // Output field 2
      {
        $bucket: {
          groupBy: '$year', // Field to group by
          boundaries: [1890, 1910, 1920, 1940], // Boundaries for the buckets
          default: 'Unknown', // Bucket id for documents which do not fall into a bucket
          output: { // Output for each bucket
            count: { $sum: 1 },
            artwork: { $push: { title: '$title', year: '$year' } }
          }
        }
      }
    ]
  }
};

/**
 * $unionWith
 *
 * @see https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionWith/
 */

const unionWith1: PipelineStage = { $unionWith: { coll: 'warehouses', pipeline: [{ $project: { state: 1, _id: 0 } }] } };
const unionWith2: PipelineStage = { $unionWith: { coll: 'sales2019q2', pipeline: [{ $set: { _id: '2019Q2' } }] } };
const unionWith3: PipelineStage = { $unionWith: 'sales2019q2' };
const unionWith4: PipelineStage = { $unionWith: { coll: 'sales2019q2', pipeline: [{ $group: { _id: '$item', total: { $sum: '$quantity' } } }] } };

/**
 * $unset
 *
 * @see https://www.mongodb.com/docs/manual/reference/operator/aggregation/unset/
 */
const unset1: PipelineStage = { $unset: '<field.nestedfield>' };
const unset2: PipelineStage = { $unset: ['isbn', 'copies'] };
const unset3: PipelineStage = { $unset: ['isbn', 'author.first', 'copies.warehouse'] };


/**
 * $unwind
 *
 * @see https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
 */

const unwind1: PipelineStage = { $unwind: '$sizes' };
const unwind2: PipelineStage = { $unwind: { path: '$sizes' } };
const unwind3: PipelineStage = { $unwind: { path: '$sizes', includeArrayIndex: 'arrayIndex' } };
const unwind4: PipelineStage = { $unwind: { path: '$sizes', preserveNullAndEmptyArrays: true } };
const unwind5: PipelineStage = { $unwind: { path: '$sizes', preserveNullAndEmptyArrays: true } };

const redact1: PipelineStage = {
  $redact: {
    $cond: {
      if: { $gt: [{ $size: { $setIntersection: ['$tags', 'userAccess'] } }, 0] },
      then: '$$DESCEND',
      else: '$$PRUNE'
    }
  }
};

const redact2: PipelineStage = {
  $redact: {
    $cond: {
      if: { $eq: ['$level', 5] },
      then: '$$PRUNE',
      else: '$$DESCEND'
    }
  }
};
const replaceRoot: PipelineStage = { $replaceRoot: { newRoot: { $mergeObjects: [{ dogs: 0, cats: 0, birds: 0, fish: 0 }, '$pets'] } } };

const project1: PipelineStage = { $project: { contact: 1, 'contact.address.country': 1 } };
const project2: PipelineStage = { $project: { 'contact.address.country': 1, contact: 1 } };
const project3: PipelineStage = { $project: { author: { first: 0 }, lastModified: 0 } };
const project4: PipelineStage = {
  $project: {
    title: 1,
    'author.first': 1,
    'author.last': 1,
    'author.middle': {
      $cond: {
        if: { $eq: ['', '$author.middle'] },
        then: '$$REMOVE',
        else: '$author.middle'
      }
    }
  }
};
const project5: PipelineStage = { $project: { 'stop.title': 1 } };
const project6: PipelineStage = { $project: { stop: { title: 1 } } };
const project7: PipelineStage = {
  $project: {
    title: 1,
    isbn: {
      prefix: { $substr: ['$isbn', 0, 3] },
      group: { $substr: ['$isbn', 3, 2] },
      publisher: { $substr: ['$isbn', 5, 4] },
      title: { $substr: ['$isbn', 9, 3] },
      checkDigit: { $substr: ['$isbn', 12, 1] }
    },
    lastName: '$author.last',
    copiesSold: '$copies'
  }
};
const project8: PipelineStage = { $project: { myArray: ['$x', '$y'] } };
const project9: PipelineStage = { $project: { x: '$name.0', _id: 0 } };
const project10: PipelineStage = { $project: { stdDev: { $stdDevPop: '$scores.score' } } };
const project11: PipelineStage = {
  $project:
  {
    item: 1,
    comparisonResult: { $strcasecmp: ['$quarter', '13q4'] }
  }
};
const project12: PipelineStage = {
  $project: {
    name: 1,
    length: { $strLenBytes: '$name' }
  }
};
const project13: PipelineStage = {
  $project: {
    name: 1,
    length: { $strLenCP: '$name' }
  }
};

const project14: PipelineStage = {
  $project:
  {
    item: 1,
    yearSubstring: { $substr: ['$quarter', 0, 2] },
    quarterSubtring: { $substr: ['$quarter', 2, -1] }
  }
};
const project15: PipelineStage = { $project: { item: 1, result: { $not: [{ $gt: ['$qty', 250] }] } } };

const sort1: PipelineStage = { $sort: { count: -1 } };
const sortByCount1: PipelineStage = { $sortByCount: '$tags' };
const sortByCount2: PipelineStage = { $sortByCount: { $mergeObjects: ['$employee', '$business'] } };

const set1: PipelineStage = { $set: { 'specs.fuel_type': 'unleaded' } };
const set2: PipelineStage = { $set: { cats: 20 } };
const set3: PipelineStage = { $set: { _id: '$item', item: 'fruit' } };
const set4: PipelineStage = { $set: { homework: { $concatArrays: ['$homework', [7]] } } };

const merge1: PipelineStage = { $merge: { into: 'newDailySales201905', on: 'salesDate' } };
const merge2: PipelineStage = { $merge: { into: 'newrestaurants', on: ['date', 'postcode'], whenMatched: 'replace', whenNotMatched: 'insert' } };
const merge3: PipelineStage = { $merge: { into: { db: 'reporting', coll: 'budgets' }, on: '_id', whenMatched: 'replace', whenNotMatched: 'insert' } };
const merge4: PipelineStage = { $merge: { into: { db: 'reporting', coll: 'orgArchive' }, on: ['dept', 'fiscal_year'], whenMatched: 'fail' } };
const merge5: PipelineStage = { $merge: { into: 'quarterlyreport', on: '_id', whenMatched: 'merge', whenNotMatched: 'insert' } };
const merge6: PipelineStage = {
  $merge: {
    into: 'monthlytotals',
    on: '_id',
    whenMatched: [
      {
        $addFields: {
          thumbsup: { $add: ['$thumbsup', '$$new.thumbsup'] },
          thumbsdown: { $add: ['$thumbsdown', '$$new.thumbsdown'] }
        }
      }],
    whenNotMatched: 'insert'
  }
};

const match1: PipelineStage = { $match: { $or: [{ score: { $gt: 70, $lt: 90 } }, { views: { $gte: 1000 } }] } };
const match2: PipelineStage = { $match: { test: 'bla' } };
const match3: PipelineStage = { $match: { test: { $or: [{ score: { $gt: 70, $lt: 90 } }, { views: { $gte: 1000 } }] } } };
const match4: PipelineStage = { $match: { $and: [{ score: { $gt: 70, $lt: 90 } }, { views: { $gte: 1000 } }] } };
const match5: PipelineStage = { $match: { test: { $and: [{ score: { $gt: 70, $lt: 90 } }, { views: { $gte: 1000 } }] } } };
const match6: PipelineStage = { $match: { test: true } };
const match7: PipelineStage = { $match: { test: { $ne: true } } };

const addFields7: PipelineStage = { $addFields: { convertedQty: { $toLong: '$qty' } } };

const setWindowFields1: PipelineStage = {
  $setWindowFields: {
    partitionBy: '$state',
    sortBy: { orderDate: 1 },
    output: {
      stdDevPopQuantityForState: {
        $stdDevPop: '$quantity',
        window: {
          documents: ['unbounded', 'current']
        }
      }
    }
  }
};

const setWindowFields2: PipelineStage = {
  $setWindowFields: {
    partitionBy: '$state',
    sortBy: { orderDate: 1 },
    output: {
      stdDevSampQuantityForState: {
        $stdDevSamp: '$quantity',
        window: {
          documents: ['unbounded', 'current']
        }
      }
    }
  }
};

const setWindowFields3: PipelineStage = {
  $setWindowFields: {
    partitionBy: '$stock',
    sortBy: { date: 1 },
    output: {
      expMovingAvgForStock: {
        $expMovingAvg: { input: '$price', N: 2 }
      }
    }
  }
};

const setWindowFields4: PipelineStage = {
  $setWindowFields: {
    partitionBy: '$stock',
    sortBy: { date: 1 },
    output: {
      expMovingAvgForStock: {
        $expMovingAvg: { input: '$price', alpha: 0.75 }
      }
    }
  }
};

const setWindowFieldsLinearFill: PipelineStage = {
  $setWindowFields: {
    partitionBy: '$stock',
    sortBy: { date: 1 },
    output: {
      price: { $linearFill: '$price' }
    }
  }
};

const setWindowFieldsLocf: PipelineStage = {
  $setWindowFields: {
    partitionBy: '$stock',
    sortBy: { date: 1 },
    output: {
      price: { $locf: '$price' }
    }
  }
};

const fillWithOutput: PipelineStage = {
  $fill: {
    output: {
      bootsSold: { value: 0 }
    }
  }
};

const fillWithPartitionBy: PipelineStage = {
  $fill: {
    partitionBy: 'date',
    output: {
      bootsSold: { value: 0 }
    }
  }
};

const fillWithPartitionByFields: PipelineStage = {
  $fill: {
    partitionByFields: ['date'],
    output: {
      bootsSold: { value: 0 }
    }
  }
};

const fillWithSortBy: PipelineStage = {
  $fill: {
    sortBy: {
      date: -1
    },
    output: {
      bootsSold: { value: 0 }
    }
  }
};

const fillWithOutputMethodLinear: PipelineStage = {
  $fill: {
    sortBy: {
      date: -1
    },
    output: {
      bootsSold: { method: 'linear' }
    }
  }
};

const fillWithOutputMethodLocf: PipelineStage = {
  $fill: {
    sortBy: {
      date: -1
    },
    output: {
      bootsSold: { method: 'locf' }
    }
  }
};

const group1: PipelineStage = { $group: { _id: null, ageStdDev: { $stdDevSamp: '$age' } } };
const group2: PipelineStage = {
  $group: {
    _id: { x: '$x' },
    y: { $first: '$y' }
  }
};
const group3: PipelineStage = {
  $group: {
    _id: null,
    count: { $count: {} }
  }
};
const group4: PipelineStage = {
  $group:
  {
    _id: '$item',
    totalSaleAmount: { $sum: { $multiply: ['$price', '$quantity'] } }
  }
};
const group5: PipelineStage = {
  $group: {
    _id: null,
    totalSaleAmount: { $sum: { $multiply: ['$price', '$quantity'] } },
    averageQuantity: { $avg: '$quantity' },
    count: { $sum: 1 }
  }
};
const group6: PipelineStage = { $group: { _id: '$author', books: { $push: '$title' } } };

const stages1: PipelineStage[] = [
  // First Stage
  {
    $match: { date: { $gte: new Date('2014-01-01'), $lt: new Date('2015-01-01') } }
  },
  // Second Stage
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
      totalSaleAmount: { $sum: { $multiply: ['$price', '$quantity'] } },
      averageQuantity: { $avg: '$quantity' },
      count: { $sum: 1 }
    }
  },
  // Third Stage
  {
    $sort: { totalSaleAmount: -1 }
  }
];

const stages2: PipelineStage[] = [
  // First Stage
  {
    $group: { _id: '$author', books: { $push: '$$ROOT' } }
  },
  // Second Stage
  {
    $addFields:
    {
      totalCopies: { $sum: '$books.copies' }
    }
  }
];

const stages3: PipelineStage[] = [
  {
    $addFields: {
      a: { $ifNull: ['$a', 'foo'] }
    }
  },
  {
    $match: {
      _id: new ObjectId('stringObjecId'),
      a: { $exists: true },
      b: null,
      c: 'test',
      d: { foo: true },
      test: { $exists: true }
    }
  }
];

const stages4: PipelineStage[] = [
  {
    $addFields: {
      usersCount: {
        $let: {
          vars: {
            users: { $push: '$user' }
          },
          in: {
            $reduce: {
              input: '$users',
              initialValue: 0,
              in: {
                $cond: { if: { $isArray: '$$this' }, then: { $size: '$$this' }, else: '$$this' }
              }
            }
          }
        }
      }
    }
  }
];

(function gh12096() {
  const data: PipelineStage.AddFields = {
    $addFields: {
      name: { $meta: 'Bill' }
    }
  };
})();


function gh12269() {
  const lookup: PipelineStage.Lookup = {
    $lookup: {
      as: 'user',
      from: 'users',
      pipeline: [{
        $search: {
          index: 'users',
          highlight: {
            path: 'user.highlighted'
          }
        }
      }]
    }
  };
}
