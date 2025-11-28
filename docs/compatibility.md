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

Mongoose relies on the [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/) to communicate with MongoDB.

You can refer to [this table](https://www.mongodb.com/docs/drivers/compatibility/?driver-language=javascript&javascript-driver-framework=nodejs) for up-to-date information as to which version of the MongoDB driver supports which version of the MongoDB server.

Below are the [SemVer](http://semver.org/) ranges representing which versions of mongoose are compatible with the listed versions of MongoDB server.

| MongoDB Server |                    Mongoose                    |
| :------------: | :--------------------------------------------: |
|     `8.x`      |                 `^8.7.0 \| ^9.0.0`             |
|     `7.x`      |            `^7.4.0 \| ^8.0.0 \| ^9.0.0`        |
|     `6.x`      |            `^7.0.0 \| ^8.0.0 \| ^9.0.0`        |
|     `5.x`      |            `^6.0.0 \| ^7.0.0 \| ^8.0.0`        |
|    `4.4.x`     |            `^6.0.0 \| ^7.0.0 \| ^8.0.0`        |
|    `4.2.x`     |            `^6.0.0 \| ^7.0.0 \| ^8.0.0`        |
|    `4.0.x`     |       `^6.0.0 \| ^7.0.0 \| ^8.0.0 <8.16.0`     |
|    `3.6.x`     |       `^6.0.0 \| ^7.0.0 \| ^8.0.0 <8.8.0`      |

Mongoose `^6.5.0` also works with MongoDB server 7.x. But not all new MongoDB server 7.x features are supported by Mongoose 6.x. To verify that your version of Mongoose is compatible based on the table above, use the [online SemVer checker](https://jubianchi.github.io/semver-check/#/).
