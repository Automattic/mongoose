declare module 'mongoose' {
  /**
     * [Stages reference](https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/#aggregation-pipeline-stages)
     */
  export type PipelineStage =
      | PipelineStage.AddFields
      | PipelineStage.Bucket
      | PipelineStage.BucketAuto
      | PipelineStage.CollStats
      | PipelineStage.Count
      | PipelineStage.Facet
      | PipelineStage.GeoNear
      | PipelineStage.GraphLookup
      | PipelineStage.Group
      | PipelineStage.IndexStats
      | PipelineStage.Limit
      | PipelineStage.ListSessions
      | PipelineStage.Lookup
      | PipelineStage.Match
      | PipelineStage.Merge
      | PipelineStage.Out
      | PipelineStage.PlanCacheStats
      | PipelineStage.Project
      | PipelineStage.Redact
      | PipelineStage.ReplaceRoot
      | PipelineStage.ReplaceWith
      | PipelineStage.Sample
      | PipelineStage.Search
      | PipelineStage.Set
      | PipelineStage.SetWindowFields
      | PipelineStage.Skip
      | PipelineStage.Sort
      | PipelineStage.SortByCount
      | PipelineStage.UnionWith
      | PipelineStage.Unset
      | PipelineStage.Unwind;

  export namespace PipelineStage {
    export interface AddFields {
      /** [`$addFields` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/addFields/) */
      $addFields: Record<string, any>
    }

    export interface Bucket {
      /** [`$bucket` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/bucket/) */
      $bucket: {
        groupBy: any
        boundaries: any[]
        default?: any
        output?: Record<string, { [op in AccumulatorOperator]?: any }>
      }
    }

    export interface BucketAuto {
      /** [`$bucketAuto` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/bucketAuto/) */
      $bucketAuto: {
        groupBy: any
        buckets: number
        output?: Record<string, { [op in AccumulatorOperator]?: any }>
        granularity?: 'R5' | 'R10' | 'R20' | 'R40' | 'R80' | '1-2-5' | 'E6' | 'E12' | 'E24' | 'E48' | 'E96' | 'E192' | 'POWERSOF2'
      }
    }

    export interface CollStats {
      /** [`$collStats` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/collStats/) */
      $collStats: {
        latencyStats?: { histograms?: boolean }
        storageStats?: { scale?: number }
        count?: {}
        queryExecStats?: {}
      }
    }

    export interface Count {
      /** [`$count` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/count/) */
      $count: string
    }

    export interface Facet {
      /** [`$facet` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/facet/) */
      $facet: Record<string, FacetPipelineStage[]>
    }

    export type FacetPipelineStage = Exclude<PipelineStage, PipelineStage.CollStats | PipelineStage.Facet | PipelineStage.GeoNear | PipelineStage.IndexStats | PipelineStage.Out | PipelineStage.Merge | PipelineStage.PlanCacheStats>;

    export interface GeoNear {
      /** [`$geoNear` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/geoNear/) */
      $geoNear: {
        near: { type: 'Point'; coordinates: [number, number] } | [number, number]
        distanceField: string
        distanceMultiplier?: number
        includeLocs?: string
        key?: string
        maxDistance?: number
        minDistance?: number
        query?: AnyObject
        spherical?: boolean
        uniqueDocs?: boolean
      }
    }

    export interface GraphLookup {
      /** [`$graphLookup` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup/) */
      $graphLookup: {
        from: string
        startWith: any
        connectFromField: string
        connectToField: string
        as: string
        maxDepth?: number
        depthField?: string
        restrictSearchWithMatch?: AnyObject
      }
    }

    export interface Group {
      /** [`$group` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/group) */
      $group: { _id: any } | { [key: string]: { [op in AccumulatorOperator]?: any } }
    }

    export interface IndexStats {
      /** [`$indexStats` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/indexStats/) */
      $indexStats: {}
    }

    export interface Limit {
      /** [`$limit` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/limit/) */
      $limit: number
    }

    export interface ListSessions {
      /** [`$listSessions` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/listSessions/) */
      $listSessions: { users?: { user: string; db: string }[] } | { allUsers?: true }
    }

    export interface Lookup {
      /** [`$lookup` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/) */
      $lookup: {
        from: string
        as: string
        localField?: string
        foreignField?: string
        let?: Record<string, any>
        pipeline?: Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out | PipelineStage.Search>[]
      }
    }

    export interface Match {
      /** [`$match` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/match/) */
      $match: AnyObject
    }

    export interface Merge {
      /** [`$merge` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/merge/) */
      $merge: {
        into: string | { db: string; coll: string }
        on?: string | string[]
        let?: Record<string, any>
        whenMatched?: 'replace' | 'keepExisting' | 'merge' | 'fail' | Extract<PipelineStage, PipelineStage.AddFields | PipelineStage.Set | PipelineStage.Project | PipelineStage.Unset | PipelineStage.ReplaceRoot | PipelineStage.ReplaceWith>[]
        whenNotMatched?: 'insert' | 'discard' | 'fail'
      }
    }

    export interface Out {
      /** [`$out` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/out/) */
      $out: string | { db: string; coll: string }
    }

    export interface PlanCacheStats {
      /** [`$planCacheStats` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/planCacheStats/) */
      $planCacheStats: {}
    }

    export interface Project {
      /** [`$project` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/project/) */
      $project: { [field: string]: any }
    }

    export interface Redact {
      /** [`$redact` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/redact/) */
      $redact: any
    }

    export interface ReplaceRoot {
      /** [`$replaceRoot` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/replaceRoot/) */
      $replaceRoot: { newRoot: any }
    }

    export interface ReplaceWith {
      /** [`$replaceWith` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/replaceWith/) */
      $replaceWith: any
    }

    export interface Sample {
      /** [`$sample` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/sample/) */
      $sample: { size: number }
    }

    export interface Search {
      /** [`$search` reference](https://docs.atlas.mongodb.com/reference/atlas-search/query-syntax/) */
      $search: {
        index?: string;
        highlight?: {
          /** [`highlightPath` reference](https://docs.atlas.mongodb.com/atlas-search/path-construction/#multiple-field-search) */
          path: string | string[] | { value: string, multi: string };
          maxCharsToExamine?: number;
          maxNumPassages?: number;
        };
        [key: string]: any;
      }
    }

    export interface Set {
      /** [`$set` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/set/) */
      $set: Record<string, any>
    }

    export interface SetWindowFields {
      /** [`$setWindowFields` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/setWindowFields/) */
      $setWindowFields: {
        partitionBy?: any
        sortBy?: Record<string, 1 | -1>
        output: Record<
        string,
        { [op in WindowOperator]?: any } & {
          window?: {
            documents?: [string | number, string | number]
            range?: [string | number, string | number]
            unit?: 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond'
          }
        }
        >
      }
    }

    export interface Skip {
      /** [`$skip` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/skip/) */
      $skip: number
    }

    export interface Sort {
      /** [`$sort` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/sort/) */
      $sort: Record<string, 1 | -1 | { $meta: 'textScore' }>
    }

    export interface SortByCount {
      /** [`$sortByCount` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/sortByCount/) */
      $sortByCount: any
    }

    export interface UnionWith {
      /** [`$unionWith` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/unionWith/) */
      $unionWith:
      | string
      | { coll: string; pipeline?: Exclude<PipelineStage, PipelineStage.Out | PipelineStage.Merge>[] }
    }

    export interface Unset {
      /** [`$unset` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/unset/) */
      $unset: string | string[]
    }

    export interface Unwind {
      /** [`$unwind` reference](https://docs.mongodb.com/manual/reference/operator/aggregation/unwind/) */
      $unwind: string | { path: string; includeArrayIndex?: string; preserveNullAndEmptyArrays?: boolean }
    }

      type AccumulatorOperator = '$accumulator' | '$addToSet' | '$avg' | '$count' | '$first' | '$last' | '$max' | '$mergeObjects' | '$min' | '$push' | '$stdDevPop' | '$stdDevSamp' | '$sum';

      type WindowOperator = '$addToSet' | '$avg' | '$count' | '$covariancePop' | '$covarianceSamp' | '$derivative' | '$expMovingAvg' | '$integral' | '$max' | '$min' | '$push' | '$stdDevSamp' | '$stdDevPop' | '$sum' | '$first' | '$last' | '$shift' | '$denseRank' | '$documentNumber' | '$rank';
  }
}
