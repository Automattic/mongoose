import type { PipelineStage } from 'mongoose';
import { expectError, expectType } from 'tsd';

/**
 * $addFields:
 *
 * @see https://docs.mongodb.com/manual/reference/operator/aggregation/addFields/
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
 * @see https://docs.mongodb.com/manual/reference/operator/aggregation/bucket/
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
 * @see https://docs.mongodb.com/manual/reference/operator/aggregation/unionWith/
 */

const unionWith1: PipelineStage = { $unionWith: { coll: 'warehouses', pipeline: [{ $project: { state: 1, _id: 0 } }] } };
const unionWith2: PipelineStage = { $unionWith: { coll: 'sales2019q2', pipeline: [{ $set: { _id: '2019Q2' } }] } };
const unionWith3: PipelineStage = { $unionWith: 'sales2019q2' };
const unionWith4: PipelineStage = { $unionWith: { coll: 'sales2019q2', pipeline: [{ $group: { _id: '$item', total: { $sum: '$quantity' } } }] } };

/**
 * $unset
 *
 * @see https://docs.mongodb.com/manual/reference/operator/aggregation/unset/
 */
const unset1: PipelineStage = { $unset: '<field.nestedfield>' };
const unset2: PipelineStage = { $unset: ['isbn', 'copies'] };
const unset3: PipelineStage = { $unset: ['isbn', 'author.first', 'copies.warehouse'] };


/**
 * $unwind
 *
 * @see https://docs.mongodb.com/manual/reference/operator/aggregation/unwind/
 */

const unwind1: PipelineStage = { $unwind: '$sizes' };
const unwind2: PipelineStage = { $unwind: { path: '$sizes' } };
const unwind3: PipelineStage = { $unwind: { path: '$sizes', includeArrayIndex: 'arrayIndex' } };
const unwind4: PipelineStage = { $unwind: { path: '$sizes', preserveNullAndEmptyArrays: true } };
const unwind5: PipelineStage = { $unwind: { path: '$sizes', preserveNullAndEmptyArrays: true } };