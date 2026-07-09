# Atlas Vector Search

[Atlas Vector Search](https://www.mongodb.com/docs/vector-search/) enables you to perform semantic searches on vector embeddings stored in MongoDB Atlas.
Vector search allows you to find similar documents based on their meaning rather than exact keyword matches, which is essential for building modern AI applications like semantic search, recommendation systems, and RAG (Retrieval-Augmented Generation) applications.

Mongoose provides full support for creating vector search indexes and running vector search queries through the MongoDB aggregation pipeline.

* [Creating a Vector Search Index](#creating-index)
* [Querying with $vectorSearch](#querying)
* [Generating Embeddings](#embeddings)

## Creating a Vector Search Index {#creating-index}

To use vector search, you first need to create a vector search index on your collection.
You can do this by calling `schema.searchIndex()` with `type: 'vectorSearch'` and defining the vector fields you want to index.

```javascript
const movieSchema = new mongoose.Schema({
  title: String,
  plot: String,
  // Vector embeddings for the plot
  // Typically 1536 dimensions for OpenAI ada-002, 768 for sentence-transformers,
  // or 1024 for Voyage AI models
  plot_embedding: {
    type: [Number],
    required: true
  }
});

// Define a vector search index
movieSchema.searchIndex({
  name: 'vector_index',
  type: 'vectorSearch',
  definition: {
    fields: [{
      type: 'vector',
      path: 'plot_embedding',
      numDimensions: 1536,  // Must match your embedding model's dimensions
      similarity: 'cosine'  // or 'euclidean' or 'dotProduct'
    }]
  }
});

const Movie = mongoose.model('Movie', movieSchema);
```

### Index Definition Fields

The vector search index definition requires the following fields:

* `type`: Must be `'vector'` for vector fields
* `path`: The field path containing the vector embeddings
* `numDimensions`: Number of dimensions in your vector embeddings. This must match the output dimensions of your embedding model
* `similarity`: The similarity function to use. Options are `'cosine'`, `'euclidean'`, or `'dotProduct'`. See [MongoDB's similarity metrics documentation](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-type/#fields) for guidance on choosing the right metric.

### Creating the Index

Once you've defined the vector search index in your schema, Mongoose can automatically create it when your model initializes if you enable the `autoSearchIndex` option:

```javascript
const movieSchema = new mongoose.Schema({
  title: String,
  plot_embedding: [Number]
}, {
  autoSearchIndex: true  // Automatically create search indexes on init
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

const Movie = mongoose.model('Movie', movieSchema);

// The vector index will be created automatically when the model initializes
await Movie.init();
```

Alternatively, you can create the index manually using `Model.createSearchIndexes()`:

```javascript
// Create all search indexes defined in the schema
await Movie.createSearchIndexes();

// Or create a single index
await Movie.createSearchIndex({
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

## Querying with $vectorSearch {#querying}

Once your vector search index is created, you can perform vector similarity searches using the `$vectorSearch` aggregation stage.

### Basic Vector Search Query

```javascript
// Your query embedding (example function - see "Generating Embeddings" section below)
// MongoDB Atlas can generate embeddings automatically, or you can use third-party providers
const queryEmbedding = await generateEmbedding('romantic comedy about friendship');

// Perform vector search
const results = await Movie.aggregate([
  {
    $vectorSearch: {
      index: 'vector_index',     // Name of your vector search index
      path: 'plot_embedding',     // Field containing the vectors
      queryVector: queryEmbedding, // Your query embedding as an array of numbers
      numCandidates: 100,         // Number of candidates to consider (should be >= limit)
      limit: 10                   // Number of results to return
    }
  },
  {
    $project: {
      title: 1,
      plot: 1,
      score: { $meta: 'vectorSearchScore' }  // Include similarity score
    }
  }
]);
```

### $vectorSearch Options

The `$vectorSearch` stage accepts the following options:

* `index` (required): Name of the vector search index to use
* `path` (required): Field path containing the vector embeddings
* `queryVector` (required): Array of numbers representing your query embedding
* `limit` (required): Maximum number of documents to return
* `numCandidates` (optional): Number of candidate documents to examine. Must be >= `limit`. Recommended: set to at least 10-20x your `limit` for better accuracy
* `filter` (optional): MQL filter expression to pre-filter documents before vector search
* `exact` (optional): Boolean. If `true`, performs exact nearest neighbor search. If `false` or omitted, performs approximate search

For detailed information on these parameters and performance tuning, see the [MongoDB Vector Search documentation](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/).

### Using Pre-filters

You can use the `filter` option to restrict your search to a subset of documents:

```javascript
const results = await Movie.aggregate([
  {
    $vectorSearch: {
      index: 'vector_index',
      path: 'plot_embedding',
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 10,
      filter: {
        year: { $gte: 2020 },     // Only movies from 2020 or later
        genre: 'comedy'            // Only comedy movies
      }
    }
  }
]);
```

The `filter` field accepts standard MongoDB query operators. For best performance, ensure the fields used in your filter are indexed. See [MongoDB's pre-filtering documentation](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#pre-filter-with-the-filter-option) for more details.

### Combining Vector Search with Other Aggregation Stages

You can combine `$vectorSearch` with other aggregation stages:

```javascript
const results = await Movie.aggregate([
  // 1. Vector search
  {
    $vectorSearch: {
      index: 'vector_index',
      path: 'plot_embedding',
      queryVector: queryEmbedding,
      numCandidates: 100,
      limit: 50
    }
  },
  // 2. Add similarity score
  {
    $addFields: {
      score: { $meta: 'vectorSearchScore' }
    }
  },
  // 3. Filter by minimum similarity threshold
  {
    $match: {
      score: { $gte: 0.7 }
    }
  },
  // 4. Sort and limit
  {
    $sort: { year: -1 }
  },
  {
    $limit: 10
  }
]);
```

## Generating Embeddings {#embeddings}

Vector embeddings are numerical representations of your data generated by embedding models.
Mongoose doesn't generate embeddings for you - you need to generate them before saving documents or performing queries.

### Using Atlas Automated Embeddings (Recommended)

**MongoDB Atlas can automatically generate embeddings for your documents** using [Atlas Vector Search Automated Embeddings](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview/).

This is the recommended approach as it:
- Eliminates the need to manage embedding generation in your application code
- Ensures consistent embedding generation across your documents
- Supports various embedding providers including OpenAI and Hugging Face
- Available in Atlas M10+ clusters and higher tiers

To use automated embeddings, configure them in your Atlas Search index definition through the Atlas UI or API. Mongoose will then work with the embeddings that Atlas generates automatically. See the [Atlas documentation](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview/) for setup instructions.

### Using Third-Party Embedding Models

If you need to generate embeddings in your application (for example, when using embedding models not supported by Atlas Automated Embeddings), you can use any embedding provider. Popular options include:

* **[Voyage AI](https://www.voyageai.com/)** - High-quality embeddings optimized for retrieval, with models like `voyage-2` and `voyage-code-2`
* **[OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)** - Models like `text-embedding-ada-002` (1536 dimensions) and `text-embedding-3-small`
* **[Hugging Face Sentence Transformers](https://huggingface.co/sentence-transformers)** - Open-source models with various dimension sizes

Example workflow for application-generated embeddings:

```javascript
// Example: Generate embeddings before saving
// Note: generateEmbedding() is pseudocode - use your embedding provider's actual SDK
async function saveMovieWithEmbedding(movieData) {
  // Generate embedding using your chosen provider's SDK
  // For example: OpenAI's client.embeddings.create(), Voyage AI's client.embed(), etc.
  const embedding = await generateEmbedding(movieData.plot);
  
  const movie = new Movie({
    title: movieData.title,
    plot: movieData.plot,
    plot_embedding: embedding  // Array of numbers from your embedding model
  });
  
  await movie.save();
  return movie;
}
```

**Important considerations for application-generated embeddings**:
- The embedding dimensions must match your index configuration (`numDimensions`)
- You must use the same embedding model for both indexing and querying
- Embeddings must be normalized if using `dotProduct` similarity

### Monitoring Index Status

After creating a vector search index, it takes time to build. Check the index status using `Model.listSearchIndexes()`:

```javascript
const indexes = await Movie.listSearchIndexes();
const vectorIndex = indexes.find(idx => idx.name === 'vector_index');

if (vectorIndex?.queryable) {
  console.log('Vector search index is ready!');
} else {
  console.log('Index is still building...');
}
```

## See Also

* [MongoDB Atlas Vector Search Documentation](https://www.mongodb.com/docs/vector-search/)
* [MongoDB Vector Search $vectorSearch Stage](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/)
* [Atlas Automated Embeddings](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview/)
* [Atlas Search](atlas-search.html) for text search and hybrid search
* [Model Search Index Methods](api/model.html#model_Model-createSearchIndex)
* [Schema searchIndex() Method](api/schema.html#schema_Schema-searchIndex)
