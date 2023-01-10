# node-red-contrib-generic-s3

<img src="icons/s3Logo.png" alt="drawing" width="150"/>


### These node-red nodes are meant to work with any S3 provider while making the workflow easier to follow

Node name  | Detailed information
------------- | -------------
List Buckets  | This node is used for listing all buckets that are available with the configured client
List Objects (Depracted)  | This node is used to list all objects that are within a bucket. The bucket can be specified either directly on this node properties or by setting input property `msg.bucket` \| There are few other added properties to this node from 1.3.2 release such as `Max keys` - Positive integer value up to 1000 that specifies how many keys(objects) can be maximum listed per request. It can also be set by input message property `msg.maxkeys` \| `Marker` - Where you want the listing to start from. The listing starts after this specified key and the marker can be any key in the bucket. It can also be set by input message property `msg.marker` \| `Prefix` - This property limits the response to keys that begin with the specified prefix. It can also be set by input message property `msg.prefix`.
List Objects V2  | This node is used to list all objects that are within a bucket. The bucket can be specified either directly on this node properties or by setting input property `msg.bucket` \| There are few other added properties to this node from 1.3.2 release such as `Max keys` - Positive integer value up to 1000 that specifies how many keys(objects) can be maximum listed per request. It can also be set by input message property `msg.maxkeys` \| `Start after` - Where you want the listing to start from. The listing starts after this specified key and the start after marker can be any key in the bucket. It can also be set by input message property `msg.startafter` \| `Prefix` - This property limits the response to keys that begin with the specified prefix. It can also be set by input message property `msg.prefix`. **Please note that we recommend using this node instead of `List Objects`, since that one is depracted and it will be removed with the next major release**
List Object Versions  | This node is used to list all object(s) version(s) that are within a bucket. The bucket can be specified either directly on this node properties or by setting input property `msg.bucket` \| `Max keys` - Positive integer value up to 1000 that specifies how many keys(objects) can be maximum listed per request. It can also be set by input message property `msg.maxkeys`  \| `Key marker` - Where you want the listing to start from. The listing starts after this specified key and the start after marker can be any key in the bucket. It can also be set by input message property `msg.keymarker` \| `Version ID Marker` - This property specifies the object version you want to start listing from. It can also be set by unput message property `msg.versionidmarker` \| `Prefix` - This property limits the response to keys that begin with the specified prefix. It can also be set by input message property `msg.prefix`. 
Get Object    | This node is used to get object contents and metadata from the specified bucket using the configured client. The `Bucket`, `Object Key` and `Version ID` can be specified in the properties of the node or by setting input properties `msg.bucket`, `msg.key` and `msg.versionid` respectively
Head Object   | This node is used to get object metadata from the specified bucket using the configured client while not fetching the object itself. The `Bucket`, `Object Key` and `Version ID` can be specified in the properties of the node or by setting input properties `msg.bucket`, `msg.key` and `msg.versionid` respectively
Create Bucket | This node is used to create bucket with perviously defined S3 client used in the configuration. The bucket name can be specified either directly on the node properties or by setting input property `msg.bucket`
Put Object    | This node is used to create or update object and(or) object's metadata with a specific key within a specified bucket. `Bucket` - The bucket \| `Key` - The object key \| `Content-Type` - Content-Type of the object's data \| `Body` - Actual contents of the object \| `Metadata` - (Optional) Metadata of the object \| `Upsert` - Upserting flag. These values can be specified in the node properites or by setting input properties like the following `msg.bucket` - The bucket \| `msg.key` - The object key \| `msg.contentType` - Content-Type of the object's data \| `msg.body` - Actual contents of the object \| `msg.metadata `- (Optional) Metadata of the object \| `msg.upsert` - (Optional) Upsert flag which before inserting compares the ETag(if the object already exists) with calculated MD5 hash of the inserting object body, and if they differ, then the object is updated
Put Objects   | This node is used to create or update objects and(or) object's metadata with a specific key within a specified bucket. `Objects` - Array of json objects that have the same format as the objects in **Put Object** node \| `Upsert` - Upserting flag. This value can be specified in the node properites or by setting input properties like the following `msg.objects` - Array of objects that the user wants to create and(or) update in a bucket. The object structure is the same as the one in the Put Object and the same rules apply of it as well \| `msg.upsert` - (Optional) Upsert flag which before inserting compares the ETag(if the object already exists) with calculated MD5 hash of the inserting object body, and if they differ, then the object is updated. This is done for each object in the provided array
Delete Object | This node is used to delete object from a specified bucket. Object's key and the bucket can be specified in the node properites or by setting input properties in `msg.bucket` and(or) `msg.key`
client-s3     | Configuration node used in all of the above mentioned nodes to perform the specified operations. Here are few tips for it that will make it much easier to use the node. The S3 endpoint should be an url beggining with `http://` or `https://`. There are fields for `Access Key` and `Key Secret`, and it is recomended that you use environment variables. Environment variables in node-red can be inputted like by enclosing the name of the variable by parentheses and prefixing it with `$`. E.g. `$(nameOfTheVar)` 

#### Install these nodes using the following command or directly via node-red dashboard
```bash
npm install node-red-contrib-generic-s3
```
