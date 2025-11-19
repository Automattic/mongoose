# Using Mongoose With [Next.js](https://nextjs.org/)

Next.js is a popular framework for building full stack applications with React.
Mongoose works out of the box with Next.js.
If you're looking to get started, please use [Next.js' official Mongoose sample app](https://github.com/vercel/next.js/tree/canary/examples/with-mongodb-mongoose).
Furthermore, if you are using Next.js with [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions), please review [Mongoose's AWS Lambda docs](https://mongoosejs.com/docs/lambda.html).

## Quick Start

Here's a basic example of using Mongoose with Next.js App Router:

```javascript
// lib/mongodb.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

export default dbConnect;

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }
  await mongoose.connect(MONGODB_URI);
  return mongoose;
}
```

Then use it in your API routes or Server Components:

```javascript
// app/api/users/route.js
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  await dbConnect();
  const users = await User.find({});
  return Response.json({ users });
}
```

## Best Practices

### Connection Management

Mongoose handles connection management automatically. Calling `mongoose.connect()` when Mongoose is already connected is a no-op, so you can safely call `dbConnect()` in every API route and Server Component without worrying about creating multiple connections.

### Environment Variables

Store your MongoDB connection string in `.env.local`:

```bash
MONGODB_URI=mongodb://localhost:27017/mydb
```

For production, use environment variables in your hosting platform (Vercel, Netlify, etc.).

### Model Registration

Define your models in a separate directory and ensure they're only registered once:

```javascript
// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
```

The `mongoose.models.User || mongoose.model('User', UserSchema)` pattern prevents model recompilation errors during hot reloading in development.

## Common Issues

There are a few common issues when working with Next.js that you should be aware of.

## TypeError: Cannot read properties of undefined (reading 'prototype')

You can fix this issue by adding the following to your `next.config.js`:

```js
const nextConfig = {
  experimental: {
    esmExternals: "loose", // <-- add this
    serverComponentsExternalPackages: ["mongoose"] // <-- and this
  },
  // and the following to enable top-level await support for Webpack
  webpack: (config) => {
    config.experiments = {
      topLevelAwait: true
    };
    return config;
  },
}
```

This issue is caused by [this change in MongoDB's bson parser](https://github.com/mongodb/js-bson/pull/564/files).
MongoDB's bson parser uses top-level await and dynamic import in ESM mode to avoid some Webpack bundling issues.
And Next.js forces ESM mode.

## Using with Pages Router

If you're using Next.js Pages Router, you can use Mongoose in API routes and `getServerSideProps`:

```javascript
// pages/api/users.js
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const users = await User.find({});
    return res.status(200).json({ users });
  }

  if (req.method === 'POST') {
    const user = await User.create(req.body);
    return res.status(201).json({ user });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

Using in `getServerSideProps`:

```javascript
// pages/users.js
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function getServerSideProps() {
  await dbConnect();
  const users = await User.find({});
  
  return {
    props: {
      users: JSON.parse(JSON.stringify(users))
    }
  };
}

export default function UsersPage({ users }) {
  return (
    <div>
      <h1>Users</h1>
      {users.map(user => (
        <div key={user._id.toString()}>{user.name}</div>
      ))}
    </div>
  );
}
```

**Important:** Use `JSON.parse(JSON.stringify())` to convert Mongoose documents to plain objects, as Next.js requires serializable data.

## Using with App Router Server Components

With Next.js 13+ App Router, you can use Mongoose directly in Server Components:

```javascript
// app/users/page.js
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';

export default async function UsersPage() {
  await dbConnect();
  const users = await User.find({}).lean();

  return (
    <div>
      <h1>Users</h1>
      {users.map(user => (
        <div key={user._id.toString()}>{user.name}</div>
      ))}
    </div>
  );
}
```

## Next.js Edge Runtime

Mongoose does **not** currently support [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes#edge-runtime).
There is no way for Mongoose to connect to MongoDB in Edge Runtime, because [Edge Runtime currently doesn't support Node.js `net` API](https://edge-runtime.vercel.app/features/available-apis#unsupported-apis), which is what the MongoDB Node Driver uses to connect to MongoDB.

## Additional Resources

* [Next.js Official Mongoose Example](https://github.com/vercel/next.js/tree/canary/examples/with-mongodb-mongoose)
* [Mongoose AWS Lambda Guide](https://mongoosejs.com/docs/lambda.html) (for serverless deployments)
* [Next.js Data Fetching Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching)
