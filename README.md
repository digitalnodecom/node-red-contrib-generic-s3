# node-red-contrib-generic-s3

<img src="icons/s3Logo.png" alt="drawing" width="150"/>


### These node-red nodes are meant to work with any S3 provider while making the workflow easier to follow

Node name  | Detailed information
------------- | -------------
List Buckets  | This node is used for listing all buckets that are available with the configured client
List Objects  | This node is used to list all objects that are within a bucket. The bucket can be specified either directly on this node properties or by setting input property `msg.bucket`
Get Object    | This node is used to get object contents and metadata from the specified bucket using the configured client. The bucket name and the object key can be specified in the properties of the node or by setting input properties `msg.bucket` and(or) `msg.key` respectively
Create Bucket | This node is used to create bucket with perviously defined S3 client used in the configuration. The bucket name can be specified either directly on the node properties or by setting input property `msg.bucket`
Put Object    | This node is used to create or update object and(or) object's metadata with a specific key within a specified bucket. `Bucket` - The bucket \| `Key` - The object key \| `Content-Type` - Content-Type of the object's data \| `Body` - Actual contents of the object \| `Metadata` - (Optional) Metadata of the object. These values can be specified in the node properites or by setting input properties like the following `msg.bucket` - The bucket \| `msg.key` - The object key \| `msg.contentType` - Content-Type of the object's data \| `msg.body` - Actual contents of the object \| `msg.metadata `- (Optional) Metadata of the object
Delete Object | This node is used to delete object from a specified bucket. Object's key and the bucket can be specified in the node properites or by setting input properties in `msg.bucket` and(or) `msg.key`

#### Install these nodes using the following command or directly via node-red dashboard
```bash
npm install node-red-contrib-generic-s3
```
