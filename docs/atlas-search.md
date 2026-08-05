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

You can define Atlas Search indexes in your Mongoose schema using the `schema.searchIndex()` method.
Mongoose can automatically create these indexes when your model initializes if you enable the `autoSearchIndex` option, otherwise you can call `Model.createSearchIndexes()` to create the indexes.

```javascript
const articleSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  tags: [String],
  publishedAt: Date
}, {
  autoSearchIndex: true  // Automatically create search indexes
});

// Define a basic text search index
articleSchema.searchIndex({
  name: 'article_search',
  definition: {
    mappings: {
      dynamic: true  // Automatically index all fields
    }
  }
});

const Article = mongoose.model('Article', articleSchema);
```

### Custom Field Mappings

For more control over which fields are indexed and how, use custom field mappings.

Atlas Search uses [Apache Lucene](https://lucene.apache.org/) analyzers for text processing.
Analyzers determine how text is tokenized, filtered, and indexed. Common analyzers include:

* `lucene.standard` - General-purpose text analysis (tokenizes on whitespace and punctuation)
* `lucene.english` - English language analysis with stemming
* `lucene.keyword` - Treats entire field value as a single token (exact matching)

For a complete list of analyzers and their configurations, see the [MongoDB Atlas Search Analyzers documentation](https://www.mongodb.com/docs/search/index/analyzers/overview/).

```javascript
articleSchema.searchIndex({
  name: 'article_search',
  definition: {
    mappings: {
      dynamic: false,  // Don't auto-index fields
      fields: {
        title: {
          type: 'string',
          analyzer: 'lucene.standard'  // Tokenize on whitespace/punctuation
        },
        content: {
          type: 'string',
          analyzer: 'lucene.english'  // English language analysis with stemming
        },
        author: {
          type: 'string',
          analyzer: 'lucene.keyword'  // Exact match only (no tokenization)
        },
        tags: {
          type: 'string',
          analyzer: 'lucene.standard'
        },
        publishedAt: {
          type: 'date'
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
await Article.createSearchIndexes();

// Create a single index programmatically
await Article.createSearchIndex({
  name: 'my_index',
  definition: {
    mappings: { dynamic: true }
  }
});
```

### Listing Indexes

```javascript
const indexes = await Article.listSearchIndexes();

for (const index of indexes) {
  console.log(`${index.name}: ${index.status}`);
}
```

### Updating Indexes

```javascript
await Article.updateSearchIndex('article_search', {
  mappings: {
    dynamic: false,
    fields: {
      title: { type: 'string' },
      content: { type: 'string' }
    }
  }
});
```

### Deleting Indexes

```javascript
await Article.dropSearchIndex('old_index');
```

## Text Search Queries

Once your search index is created, you can use the `$search` aggregation stage to perform text searches.

```javascript
// Example query showcasing different text search options:
const results = await Article.aggregate([
  {
    $search: {
      index: 'article_search',
      text: {
        query: 'mongodb database',
        path: 'content'  // Single field search
        // path: ['title', 'content', 'tags']  // Multi-field: search across multiple fields
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
// Find articles about 'mongodb' published since 2023, ranked by relevance,
// with a score boost for articles whose title includes 'tutorial'
const results = await Article.aggregate([
  {
    $search: {
      index: 'article_search',
      compound: {
        must: [
          {
            text: {
              query: 'mongodb',
              path: 'content'  // Article must mention 'mongodb' in content
            }
          }
        ],
        should: [
          {
            text: {
              query: 'tutorial',
              path: 'title',
              score: { boost: { value: 2 } }  // Double the score for articles with 'tutorial' in the title
            }
          }
        ],
        filter: [
          {
            range: {
              path: 'publishedAt',
              gte: new Date('2023-01-01')  // Only include articles published in 2023 or later
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      title: 1,
      content: 1,
      score: { $meta: 'searchScore' }  // Include the relevance score in the results
    }
  },
  {
    $match: {
      score: { $gte: 5 }  // Adjust this threshold based on your data
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

```javascript
const queryEmbedding = await generateEmbedding('machine learning tutorial');

const results = await Article.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          // Semantic search subpipeline
          vector: [
            {
              $vectorSearch: {
                index: 'article_vector_index',
                path: 'embedding',
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
                index: 'article_search',
                text: { query: 'machine learning', path: 'content' }
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

* **Use `autoSearchIndex: true` in development**: Automatically sync indexes with your schema
* **Manage indexes manually in production**: Manage indexes through `Model.createSearchIndexes()`, Atlas UI, MongoDB CLI, or deployment scripts to avoid unintended changes during application deployments
* **Monitor index status**: Always check `listSearchIndexes()` after creation to ensure indexes are ready (`queryable: true`)

### Schema Design

```javascript
// Good: Define indexes in schema for version control
articleSchema.searchIndex({
  name: 'article_search',
  definition: { mappings: { dynamic: false, fields: { /* ... */ } } }
});

// Also good: Separate index management for production
const createProductionIndexes = async () => {
  const indexes = await Article.listSearchIndexes();
  if (!indexes.find(idx => idx.name === 'article_search')) {
    await Article.createSearchIndex({ /* definition */ });
  }
};
```

### Query Optimization

* **Use `$limit` early**: Reduce the number of documents passed to subsequent pipeline stages
* **Filter before searching**: Use `$match` before `$search` when possible to reduce search scope
* **Project only needed fields**: Use `$project` to return only necessary data
* **Index the right fields**: Don't use `dynamic: true` in production; explicitly index only the fields you search

### Managing Indexes Outside Mongoose

For production deployments, you may want to manage indexes through:

* **Atlas UI**: Create and manage indexes through the MongoDB Atlas web interface
* **MongoDB Compass**: Visual tool for managing indexes with a user-friendly interface (MongoDB 7.0+)
* **MongoDB CLI**: Use `mongosh` or MongoDB CLI tools for scripting index operations
* **Atlas Admin API**: Programmatically manage indexes via the Atlas API

Disable `autoSearchIndex` in production to prevent automatic index changes during deployments.

## See Also

* [Vector Search](https://mongoosejs.com/docs/atlas-vector-search.html) for semantic search with embeddings
* [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/search/)
* [Atlas Search Analyzers](https://www.mongodb.com/docs/search/index/analyzers/overview/)
* [Model Search Index Methods](https://mongoosejs.com/docs/api/model.html#model_Model-createSearchIndex)
* [Schema searchIndex() Method](https://mongoosejs.com/docs/api/schema.html#schema_Schema-searchIndex)
* [Aggregation](https://mongoosejs.com/docs/api/aggregate.html) for building complex pipelines
