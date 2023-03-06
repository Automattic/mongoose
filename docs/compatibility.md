# MongoDB Server Version Compatibility

<style>
    tr > td, tr > th {
        border: 1px solid;
        padding: 8px;
    }

    table tr:nth-child(2n) {
        background: rgba(0,0,0,.03);
    }
</style>

Mongoose relies on the [MongoDB Node.js Driver](http://mongodb.github.io/node-mongodb-native/) to talk to MongoDB.  
You can refer to [this table](https://www.mongodb.com/docs/drivers/node/current/compatibility/) for up-to-date information as to which version of the MongoDB driver supports which version of MongoDB.

Below are the [semver](http://semver.org/) ranges representing which versions of mongoose are compatible with the listed versions of MongoDB server.

| MongoDB Server |           Mongoose            |
| :------------: | :---------------------------: |
|     `6.x`      |      `^6.5.0 \| ^7.0.0`       |
|     `5.x`      |      `^6.0.0 \| ^7.0.0`       |
|    `4.4.x`     | `^5.10.0 \| ^6.0.0 \| ^7.0.0` |
|    `4.2.x`     | `^5.7.0 \| ^6.0.0 \| ^7.0.0`  |
|    `4.0.x`     | `^5.2.0 \| ^6.0.0 \| ^7.0.0`  |
|    `3.6.x`     | `^5.0.0 \| ^6.0.0 \| ^7.0.0`  |
|    `3.4.x`     |      `^4.7.3 \| ^5.0.0`       |
|    `3.2.x`     |      `^4.3.0 \| ^5.0.0`       |
|    `3.0.x`     | `^3.8.22 \| ^4.0.0 \| ^5.0.0` |
|    `2.6.x`     | `^3.8.8 \| ^4.0.0 \| ^5.0.0`  |
|    `2.4.x`     |      `^3.8.0 \| ^4.0.0`       |

Note that Mongoose `5.x` dropped support for all versions of MongoDB before `3.0.0`. If you need to use MongoDB `2.6` or older, use Mongoose `4.x`.
