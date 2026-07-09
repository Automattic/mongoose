# Atlas Search

[Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/) enables fine-grained text indexing and querying of data on your Atlas cluster.
You can use Atlas Search to build fast, relevance-based search capabilities on top of your MongoDB data.

Mongoose provides full support for managing Atlas Search indexes through your schema definitions, and querying with the `$search` aggregation stage.

* [Creating a Search Index](#creating-index)
* [Managing Search Indexes](#managing-indexes)
* [Text Search Queries](#text-search)
* [Vector Search](#vector-search)
* [Hybrid Search](#hybrid-search)

## Creating a Search Index {#creating-index}

You can define Atlas Search indexes in your Mongoose schema using the `schema.searchIndex()` method.
Mongoose can automatically create these indexes when your model initializes if you enable the `autoSearchIndex` option.

### Basic Text Search Index

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

// Index will be created when model initializes
await Article.init();
```

### Custom Field Mappings

For more control over which fields are indexed and how, use custom field mappings.

Atlas Search uses [Apache Lucene](https://lucene.apache.org/) analyzers for text processing.
Analyzers determine how text is tokenized, filtered, and indexed. Common analyzers include:

* `lucene.standard` - General-purpose text analysis (tokenizes on whitespace and punctuation)
* `lucene.english` - English language analysis with stemming
* `lucene.keyword` - Treats entire field value as a single token (exact matching)

For a complete list of analyzers and their configurations, see the [MongoDB Atlas Search Analyzers documentation](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/).

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

### Vector Search Index

For semantic search using vector embeddings, create a vector search index.
See the [Vector Search](atlas-vector-search.html) guide for detailed information.

```javascript
const movieSchema = new mongoose.Schema({
  title: String,
  plot_embedding: [Number]
});

movieSchema.searchIndex({
  name: 'vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [{
      type: 'vector',
      path: 'plot_embedding',
      numDimensions: 1536,
      similarity: 'cosine'
    }]
  }
});
```

## Managing Search Indexes {#managing-indexes}

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

## Text Search Queries {#text-search}

Once your search index is created, you can use the `$search` aggregation stage to perform text searches.

### Basic Text Search

```javascript
// Basic search in a single field
const results = await Article.aggregate([
  {
    $search: {
      index: 'article_search',
      text: {
        query: 'mongodb database',
        path: 'content'  // Search in the content field
      }
    }
  },
  {
    $limit: 10
  }
]);

// Multi-field search: search across title, content, and tags
const multiFieldResults = await Article.aggregate([
  {
    $search: {
      index: 'article_search',
      text: {
        query: 'mongoose tutorial',
        path: ['title', 'content', 'tags']  // Search in multiple fields
      }
    }
  }
]);

// Fuzzy matching: find results even with typos
const fuzzyResults = await Article.aggregate([
  {
    $search: {
      index: 'article_search',
      text: {
        query: 'datbase',  // Typo: "database"
        path: 'content',
        fuzzy: {
          maxEdits: 2  // Allow up to 2 character differences
        }
      }
    }
  }
]);
```

### Compound Queries

Combine multiple search criteria with `must`, `should`, and `filter` clauses:

```javascript
const results = await Article.aggregate([
  {
    $search: {
      index: 'article_search',
      compound: {
        must: [
          {
            text: {
              query: 'mongodb',
              path: 'content'
            }
          }
        ],
        should: [
          {
            text: {
              query: 'tutorial',
              path: 'title',
              score: { boost: { value: 2 } }  // Boost title matches
            }
          }
        ],
        filter: [
          {
            range: {
              path: 'publishedAt',
              gte: new Date('2023-01-01')
            }
          }
        ]
      }
    }
  }
]);
```

### Including Search Scores

Include the relevance score in your results using the `$meta` operator:

```javascript
const results = await Article.aggregate([
  {
    $search: {
      index: 'article_search',
      text: {
        query: 'mongodb',
        path: 'content'
      }
    }
  },
  {
    $project: {
      title: 1,
      content: 1,
      // The $meta: 'searchScore' operator returns the relevance score
      // calculated by Atlas Search based on how well the document matches the query
      score: { $meta: 'searchScore' }
    }
  },
  {
    $match: {
      score: { $gte: 5 }  // Only return high-quality matches
    }
  }
]);
```

## Vector Search {#vector-search}

For semantic search using vector embeddings, use the `$vectorSearch` stage.
See the complete [Vector Search](atlas-vector-search.html) guide for detailed examples.

```javascript
const queryEmbedding = await generateEmbedding('romantic comedy');

const results = await Movie.aggregate([
  {
    $vectorSearch: {
      index: 'vector_index',
      path: 'plot_embedding',
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 10
    }
  },
  {
    $project: {
      title: 1,
      plot: 1,
      score: { $meta: 'vectorSearchScore' }  // Vector search uses vectorSearchScore
    }
  }
]);
```

## Hybrid Search {#hybrid-search}

Combine text search and vector search to leverage both keyword relevance and semantic similarity.

### Using $unionWith

Perform separate searches and combine results:

```javascript
const queryEmbedding = await generateEmbedding('machine learning tutorial');

const results = await Article.aggregate([
  // Text search branch
  {
    $search: {
      index: 'article_search',
      text: {
        query: 'machine learning tutorial',
        path: ['title', 'content']
      }
    }
  },
  {
    $limit: 20
  },
  {
    $addFields: {
      textScore: { $meta: 'searchScore' },
      searchType: 'text'
    }
  },
  // Combine with vector search
  {
    $unionWith: {
      coll: 'articles',
      pipeline: [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'content_embedding',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 20
          }
        },
        {
          $addFields: {
            vectorScore: { $meta: 'vectorSearchScore' },
            searchType: 'vector'
          }
        }
      ]
    }
  },
  // Combine scores
  {
    $addFields: {
      combinedScore: {
        $add: [
          { $ifNull: ['$textScore', 0] },
          { $multiply: [{ $ifNull: ['$vectorScore', 0] }, 10] }  // Weight vector results more
        ]
      }
    }
  },
  // Deduplicate by _id, keeping highest score
  {
    $group: {
      _id: '$_id',
      doc: { $first: '$$ROOT' },
      maxScore: { $max: '$combinedScore' }
    }
  },
  {
    $replaceRoot: { newRoot: '$doc' }
  },
  {
    $sort: { combinedScore: -1 }
  },
  {
    $limit: 10
  }
]);
```

## Best Practices

### Index Management

* **Use `autoSearchIndex: true` in development**: Automatically sync indexes with your schema
* **Manage indexes manually in production**: Create and update indexes through Atlas UI, MongoDB CLI, or deployment scripts to avoid unintended changes during application deployments
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
* **MongoDB Compass**: Visual tool for managing indexes with a user-friendly interface
* **MongoDB CLI**: Use `mongosh` or MongoDB CLI tools for scripting index operations
* **Atlas Admin API**: Programmatically manage indexes via the Atlas API

Disable `autoSearchIndex` in production to prevent automatic index changes during deployments.

## See Also

* [Vector Search](atlas-vector-search.html) for semantic search with embeddings
* [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/)
* [Atlas Search Analyzers](https://www.mongodb.com/docs/atlas/atlas-search/analyzers/)
* [Model Search Index Methods](api/model.html#model_Model-createSearchIndex)
* [Schema searchIndex() Method](api/schema.html#schema_Schema-searchIndex)
* [Aggregation](https://mongoosejs.com/docs/api/aggregate.html) for building complex pipelines
