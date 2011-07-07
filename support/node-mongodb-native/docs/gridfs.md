GridStore
======

GridFS is a scalable MongoDB *filesystem* for storing and retrieving large files. The default limit for a MongoDB record is
4 MB, so to store data that is larger than this limit, GridFS can be used. GridFS shards the data into smaller chunks automatically. 
See [MongoDB documentation](http://www.mongodb.org/display/DOCS/GridFS+Specification) for details.

GridStore is a single file inside GridFS that can be managed by the script.

## Open GridStore

Opening a GridStore (a single file in GridFS) is a bit similar to opening a database. At first you need to create a GridStore object and then `open` it. 

    var gs = new mongodb.GridStore(db, filename, mode[, options])

Where

  * `db` is the database object
  * `filename` is the name of the file in GridFS that needs to be accessed/created
  * `mode` indicates if this is a read (value `"r"`), write (`"w"`) or append (`"w+"`) operation
  * `options` can be used to specify some metadata for the file, for example `content_type`, `metadata` and `chunk_size`

Example:

    var gs = new mongodb.GridStore(db, "test.png", "w", {
        "content_type": "image/png",
        "metadata":{
            "author": "Daniel"
        },
        "chunk_size": 1024*4
    });

When GridStore object is created, it needs to be opened

    gs.open(callback);
    
`callback` gets two parameters - and error object (if error occured) and the GridStore object.

Opened GridStore object has a set of useful properties

  * `gs.length` - length of the file in bytes
  * `gs.contentType` - the content type for the file
  * `gs.uploadDate` - when the file was uploaded
  * `gs.metadata` - metadata that was saved with the file
  * `gs.chunkSize` - chunk size

Example

    gs.open(function(err, gs){
        console.log("this file was uploaded at "+gs.uploadDate);
    });

## Writing to GridStore

Writing can be done with `write`

    gs.write(data, callback)
    
where `data` is a `Buffer` or a string, callback gets two parameters - an error object (if error occured) and result value which indicates if the write was successful or not.

While the GridStore is not closed,  every write is appended to the opened GridStore.

## Reading from GridStore

Reading from GridStore can be done with `read`

    gs.read([size[, offset]], callback)
    
where

  * `size` is the length of the data to be read
  * `offset` is the position to start reading
  * `callback` is a callback function with two parameters - error object (if an error occured) and data (binary string)

## Delete a GridStore

GridStore files can be unlinked with `unlink`

    mongodb.GridStore.unlink(db, name, callback)

Where

  * `db` is the databse object
  * `name` is either the name of a GridStore object or an array of GridStore object names
  * `callback` is the callback function

## Closing the GridStore

GridStore needs to be closed after usage. This can be done with `close`

    gs.close(callback)
    
## Check the existance of a GridStore file

Checking if a file exists in GridFS can be done with `exist`

    mongodb.GridStore.exist(db, filename, callback)
    
Where

  * `db` is the database object
  * `filename` is the name of the file to be checked
  * `callback` is a callback function with two parameters - an error object (if an error occured) and a boolean value indicating if the file exists or not
  
## Seeking in a GridStore

Seeking can be done with `seek`

    gs.seek(position);

This function moves the internal pointer to the specified position.