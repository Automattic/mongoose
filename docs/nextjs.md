# Using Mongoose With [Next.js](https://nextjs.org/)

Next.js is a popular framework for building full stack applications with React.
Mongoose works out of the box with Next.js.
If you're looking to get started, please use [Next.js' official Mongoose sample app](https://github.com/vercel/next.js/tree/canary/examples/with-mongodb-mongoose).
Furthermore, if you are using Next.js with [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions), please review [Mongoose's AWS Lambda docs](https://vercel.com/docs/concepts/functions/serverless-functions).

There are a few common issues when working with Next.js that you should be aware of.

### TypeError: Cannot read properties of undefined (reading 'prototype')

You can fix this issue by adding the following to your `next.config.js`:

```
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

### Next.js Edge Runtime

Mongoose does **not** currently support [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes#edge-runtime).
While you can import Mongoose in Edge Runtime, you'll get [Mongoose's browser library](browser.html).
There is no way for Mongoose to connect to MongoDB in Edge Runtime, because [Edge Runtime currently doesn't support Node.js `net` API](https://edge-runtime.vercel.app/features/available-apis#unsupported-apis), which is what the MongoDB Node Driver uses to connect to MongoDB.