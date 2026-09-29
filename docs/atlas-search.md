# Atlas Search

[Atlas Search](https://www.mongodb.com/docs/search/) enables fine-grained text indexing and querying of data on your Atlas cluster.
You can use Atlas Search to build fast, relevance-based search capabilities on top of your MongoDB data.

Mongoose provides full support for managing Atlas Search indexes through your schema definitions, and querying with the `$search` aggregation stage.

* [Creating a Search Index](#creating-a-search-index)
* [Managing Search Indexes](#managing-search-indexes)
* [Text Search Queries](#text-search-queries)
* [Vector Search](#vector-search)
* [Hybrid Search](#hybrid-search)

## Creating a Search Index

You can define Atlas Search indexes in your Mongoose schema using `schema.searchIndex()` and `Model.createSearchIndexes()` to create the indexes.

Mongoose can optionally create the search indexes for you when your model initializes if you enable the [autoSearchIndex](https://mongoosejs.com/docs/guide.html#autoSearchIndex) option.

```javascript
const movieSchema = new mongoose.Schema({
  title: String,
  fullplot: String,
  genres: [String],
  cast: [String],
  year: Number
});

// Define a basic text search index
movieSchema.searchIndex({
  name: 'movie_search',
  definition: {
    mappings: {
      dynamic: false,
      fields: {
        title: { type: 'string' },
        fullplot: { type: 'string' },
        cast: { type: 'string' },
        year: { type: 'number' }
      }
    }
  }
});

const Movie = mongoose.model('Movie', movieSchema);

await Movie.createSearchIndexes();  // Create the index
```

Optionally, you can set `dynamic: true` to index all supported fields. However, this is not recommended in production as it can lead to unnecessary storage usage.

### Selecting Text Analyzers

For more control over how fields are indexed, use custom the `analyzer` option.

Atlas Search uses [Apache Lucene](https://lucene.apache.org/) analyzers for text processing.
Analyzers determine how text is tokenized, filtered, and indexed. Common analyzers include:

* `lucene.standard` - General-purpose text analysis (tokenizes on whitespace and punctuation)
* `lucene.english` - English language analysis with stemming
* `lucene.keyword` - Treats entire field value as a single token (exact matching)

For a complete list of analyzers and their configurations, see the [MongoDB Atlas Search Analyzers documentation](https://www.mongodb.com/docs/search/index/analyzers/overview/).

```javascript
movieSchema.searchIndex({
  name: 'movie_search',
  definition: {
    mappings: {
      dynamic: false,
      fields: {
        title: {
          type: 'string',
          analyzer: 'lucene.standard'  // Tokenize on whitespace/punctuation
        },
        fullplot: {
          type: 'string',
          analyzer: 'lucene.english'  // English language analysis with stemming
        },
        genres: {
          type: 'string',
          analyzer: 'lucene.keyword'  // Exact match only (no tokenization)
        },
        cast: {
          type: 'string',
          analyzer: 'lucene.standard'
        },
        year: {
          type: 'number'
        }
      }
    }
  }
});
```

## Managing Search Indexes

Mongoose provides several methods for managing Atlas Search indexes:

### Creating Indexes

```javascript
// Create all indexes defined in the schema
await Movie.createSearchIndexes();

// Create a single index programmatically
await Movie.createSearchIndex({
  name: 'my_index',
  definition: {
    mappings: { dynamic: true }
  }
});
```

### Listing Indexes

```javascript
const indexes = await Movie.listSearchIndexes();

for (const index of indexes) {
  console.log(`${index.name}: ${index.status}`);
}
```

### Updating Indexes

```javascript
await Movie.updateSearchIndex('movie_search', {
  mappings: {
    dynamic: false,
    fields: {
      title: { type: 'string' },
      fullplot: { type: 'string' },
      cast: { type: 'string' },
      year: { type: 'number' }
    }
  }
});
```

### Deleting Indexes

```javascript
await Movie.dropSearchIndex('old_index');
```

## Text Search Queries

Once your search index is created, you can use the `$search` aggregation stage to perform text searches.

```javascript
// Example query showcasing different text search options:
const results = await Movie.aggregate([
  {
    $search: {
      index: 'movie_search',
      text: {
        query: 'eternal sunshine',
        path: 'title'  // Single field search
        // path: ['title', 'fullplot', 'genres']  // Multi-field: search across multiple fields
        // fuzzy: { maxEdits: 2 }  // Fuzzy: tolerate typos (up to 2 char differences)
      }
    }
  },
  { $limit: 10 }
]);
```

### Compound Queries

Combine multiple search criteria with `must`, `should`, and `filter` clauses. Include relevance scores using the `$meta` operator. Atlas Search [scores](https://www.mongodb.com/docs/search/query/score/overview/) are relative to your dataset, so remember to adjust the `$match` threshold based on the scores you observe in your data.

```javascript
// Find movies whose title includes 'mission' released since 2000, ranked by relevance,
// with a score boost for movies whose cast includes Tom Cruise.
// Top 3 results should be `Mission: Impossible II`, `Mission: Impossible - Ghost Protocol`,
// and `Mission: Impossible III`.
const results = await Movie.aggregate([
  {
    $search: {
      index: 'movie_search',
      compound: {
        must: [
          {
            text: {
              query: 'mission',
              path: 'title'
            }
          }
        ],
        should: [
          {
            text: {
              query: 'tom cruise',
              path: 'cast',
              score: { boost: { value: 5 } },  // Double the score for movies starring Tom Cruise
              matchCriteria: 'all'  // Only boost score if all terms match
            }
          }
        ],
        filter: [
          {
            range: {
              path: 'year',
              gte: 2000  // Only include movies released in 2000 or later
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      title: 1,
      cast:1,
      fullplot: 1,
      score: { $meta: 'searchScore' }  // Include the relevance score in the results
    }
  },
  {
    $match: {
      score: { $gte: .5 }  // Start low and adjust this threshold based on your data
    }
  }
]);
```

## Vector Search

For semantic search using vector embeddings, use the `$vectorSearch` stage.
See the complete [Vector Search](https://mongoosejs.com/docs/atlas-vector-search.html) guide for detailed examples.

## Hybrid Search

Combine text search and vector search to leverage both keyword relevance and semantic similarity.

Use `$rankFusion` to run `$vectorSearch` and `$search` as separate subpipelines and merge their results using [Reciprocal Rank Fusion (RRF)](https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search/). Note that `$search` must be the first stage in its subpipeline, which is why it cannot be used directly after `$vectorSearch` in the same pipeline.

*This example uses the `generateEmbedding()` function from the [Vector Search](https://mongoosejs.com/docs/atlas-vector-search.html#using-third-party-embedding-models) guide.*

```javascript
// See the Vector Search guide for details on generating embeddings
const queryEmbedding = await generateEmbedding('charming animals with adventurous tone');

const results = await Movie.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          // Semantic search subpipeline
          vector: [
            {
              $vectorSearch: {
                index: 'vector_index',  // Name of your vector search index
                path: 'plot_embedding_voyage_3_large',  // Name of the field containing the embeddings
                queryVector: queryEmbedding,
                numCandidates: 100,
                limit: 50
              }
            }
          ],
          // Keyword search subpipeline
          text: [
            {
              $search: {
                index: 'movie_search',
                text: { query: 'adventure animals', path: 'fullplot' }
              }
            },
            { $limit: 50 }
          ]
        }
      },
      combination: {
        weights: {
          vector: 0.7,  // 70% weight to semantic relevance
          text: 0.3     // 30% weight to keyword relevance
        }
      }
    }
  },
  { $limit: 10 }
]);
```

For more details, see the [Atlas Hybrid Search documentation](https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search/).

## Best Practices

### Index Management

* **Use [`autoSearchIndex: true`](https://mongoosejs.com/docs/guide.html#autoSearchIndex) in development**: Automatically create indexes with your schema
* **Manage indexes manually in production**: Manage indexes through `Model.createSearchIndexes()`, Atlas UI, MongoDB CLI, or deployment scripts to avoid unintended changes during application deployments
* **Monitor index status**: Always check `listSearchIndexes()` after creation to ensure indexes are ready (`queryable: true`)

### Schema Design

```javascript
// Good: Define indexes in schema for version control
movieSchema.searchIndex({
  name: 'movie_search',
  definition: { mappings: { dynamic: false, fields: { /* ... */ } } }
});

// Also good: Separate index management for production
const createProductionIndexes = async () => {
  await Article.createSearchIndex({ /* definition */ });
};
```

### Query Optimization

* **Use `$limit` early**: Reduce the number of documents passed to subsequent pipeline stages
* **`$search` must be the first stage**: Place `$search` as the first stage in your pipeline — using `$match` before `$search` throws an error. To filter documents during search, use the `filter` clause inside a `compound` operator instead
* **Project only needed fields**: Use `$project` to return only necessary data
* **Index the right fields**: Avoid `dynamic: true` in production. Dynamic mappings index every field. Use static mappings to index only the fields you search
* You can leverage the MongoDB [Agent Skills](https://github.com/mongodb/agent-skills) package to help you optimize your queries.

### Managing Indexes Outside Mongoose

For production deployments, you may want to manage indexes through:

* **Atlas UI**: Create and manage indexes through the MongoDB Atlas web interface
* **MongoDB Compass**: Visual tool for managing indexes with a user-friendly interface (MongoDB 7.0+)
* **MongoDB CLI**: Use `mongosh` or MongoDB CLI tools for scripting index operations
* **Atlas Admin API**: Programmatically manage indexes via the Atlas API

Disable [`autoSearchIndex`](https://mongoosejs.com/docs/guide.html#autoSearchIndex) in production to prevent automatic index changes during deployments.

## See Also

* [Vector Search](https://mongoosejs.com/docs/atlas-vector-search.html) for semantic search with embeddings
* [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/search/)
* [Atlas Search Analyzers](https://www.mongodb.com/docs/search/index/analyzers/overview/)
* [Model Search Index Methods](https://mongoosejs.com/docs/api/model.html#model_Model-createSearchIndex)
* [Schema searchIndex() Method](https://mongoosejs.com/docs/api/schema.html#schema_Schema-searchIndex)
* [Aggregation](https://mongoosejs.com/docs/api/aggregate.html) for building complex pipelines
