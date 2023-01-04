module.exports = function(RED) {
    "use strict";
    var fs = require('fs');
    const crypto = require('crypto');
    const { S3 } = require('@aws-sdk/client-s3');
    const { Readable } = require('stream');

    // Check if value is JSON string
    const isJsonString = (str) => {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    // Check if value is object
    const isObject = (obj) => {
        return Object.prototype.toString.call(obj) === '[object Object]'
    }

    // Check if value string
    const isString = (value) => {
        return typeof value === 'string' || value instanceof String;
    }

    // Convert stream to string
    const streamToString = (stream) =>
        new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        });

    // Convert string to stream
    const stringToStream = (string) => {
        var stream = new Readable();
        if(!isString(string)) return null;
        // Catch this in later nodes
        try {
            stream.push(string);
            stream.push(null);
            return stream;
        } catch (err) {
           return `Error: ${err}`;
        }
    }

    // Check if a given array has valid input objects
    const isValidInputObjectArray = (arr) => {
        let isValid = true;
        arr.forEach(element => {
            if (
                !element.hasOwnProperty('bucket') ||
                !element.hasOwnProperty('key') ||
                !element.hasOwnProperty('body') ||
                !element.hasOwnProperty('contentType') ||
                !isString(element['body'])
            ) isValid = false;

            if(element.hasOwnProperty('metadata'))
                if(!isJsonString(element.metadata))
                    if(!isObject(element.metadata))
                        isValid = false;
        });
        return isValid;
    }

    // Create S3 client format object array from input object array
    const createS3formatInputObjectArray = (arr) => {
        let s3Array = [];
        arr.forEach(element => {
            if(element.hasOwnProperty('metadata'))
                s3Array.push({
                    Bucket: element.bucket,
                    Key: element.key,
                    ContentType: element.contentType,
                    Body: stringToStream(element.body),
                    Metadata: element.metadata
                })
            else
                s3Array.push({
                    Bucket: element.bucket,
                    Key: element.key,
                    ContentType: element.contentType,
                    Body: stringToStream(element.body)
                })
        })

        return s3Array;
    }

    // Configuration / Client node
    function ClientNode(n) {
        RED.nodes.createNode(this,n);
        this.endpoint = n.endpoint.trim();
        this.region = n.region.trim();
    }

    RED.nodes.registerType("client-s3",ClientNode, {
        credentials: {
            accesskeyid: { type:"text" },
            secretaccesskey: { type: "password" }
        },
        defaults: {
            endpoint: { type:"text" },
            region: { type:"text" }
        }
    });

    // LIST BUCKETS NODE
    function S3ListBuckets(n) {
        RED.nodes.createNode(this,n); // Getting options for the current node
        this.conf = RED.nodes.getNode(n.conf); // Getting configuration
        var node = this; // Referencing the current node
        var config = this.conf ? this.conf : null; // Cheking if the conf is valid

        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        // Make the handler for the input event async
        this.on("input", async function(msg,send,done) {
            try {
                // Creating S3 client
                this.s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Fetching"});
                // Listing all the buckets and formatting the message
                const response = await this.s3Client.listBuckets({});
                delete response.$metadata;

                // Sending the message
                send({
                    payload: response
                });

                this.s3Client.destroy();

                // Finalizing
                done();

                node.status({fill:"green",shape:"dot",text:"Success"});
                setTimeout(() => {
                    node.status({});
                }, 2000);
            }
            catch (err) {
                // If an error occurs
                node.error(err);
                this.s3Client.destroy();
                done();
                
                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 3000);
            }
        });
    }
    
    RED.nodes.registerType("List Buckets", S3ListBuckets);

    // List items from single bucket
    function S3ListObjects(n) {
        RED.nodes.createNode(this,n); // Getting options for the current node
        this.conf = RED.nodes.getNode(n.conf); // Getting configuration
        var node = this; // Referencing the current node
        var config = this.conf ? this.conf : null; // Cheking if the conf is valid
        this.bucket = n.bucket != "" ? n.bucket : null;

        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input', async function(msg, send, done) {
            if(!this.bucket) {
                this.bucket = msg.bucket ? msg.bucket : null;
                if(!this.bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            try {

                // Creating S3 client
                this.s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Fetching"});
                // List all objects from the desired bucket
                const response = await this.s3Client.listObjects({
                    Bucket: this.bucket
                });
                delete response.$metadata;

                node.send({
                    payload: response
                });

                // Finalize
                this.s3Client.destroy();
                done();

                node.status({fill:"green",shape:"dot",text:"Success"});
                setTimeout(() => {
                    node.status({});
                }, 2000);
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                this.s3Client.destroy();
                done();

                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 3000);
            }

        })
    }

    RED.nodes.registerType('List Objects', S3ListObjects);

    // Get Object
    function S3GetObject(n) {
        RED.nodes.createNode(this,n); // Getting options for the current node
        this.conf = RED.nodes.getNode(n.conf); // Getting configuration
        var node = this; // Referencing the current node
        var config = this.conf ? this.conf : null; // Cheking if the conf is valid
        this.bucket = n.bucket != "" ? n.bucket : null;
        this.key = n.key != "" ? n.key : null;

        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input', async function(msg, send, done) {
            
            // Checking for correct properties input
            if(!this.bucket) {
                this.bucket = msg.bucket ? msg.bucket : null;
                if(!this.bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            if(!this.key) {
                this.key = msg.key ? msg.key : null;
                if(!this.key) {
                    node.error('No object key provided!');
                    return;
                }
            }

            try {
                // Creating S3 client
                this.s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Fetching"});

                const response = await this.s3Client.getObject({
                   Bucket: this.bucket,
                   Key: this.key 
                });

                const data = await streamToString(response.Body);
                const metaData = response.Metadata;

                delete response.Body;
                delete response.Metadata;
                delete response.$metadata;

                // done();

                send({
                    payload: {
                        Object: response,
                        Data: data,
                        MetaData: metaData
                    }
                });

                // Finalize
                this.s3Client.destroy();
                done();

                node.status({fill:"green",shape:"dot",text:"Success"});
                setTimeout(() => {
                    node.status({});
                }, 2000);
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                this.s3Client.destroy();
                done();

                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 3000);
            }
        });
    }

    RED.nodes.registerType('Get Object', S3GetObject);

    // Put Object
    function S3PutObject(n) {
        RED.nodes.createNode(this,n); // Getting options for the current node
        this.conf = RED.nodes.getNode(n.conf); // Getting configuration
        var node = this; // Referencing the current node
        var config = this.conf ? this.conf : null; // Cheking if the conf is valid

        // If there is no conifg
        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input', async function(msg, send, done) {

            this.bucket = n.bucket !== "" ? n.bucket : null; // Bucket info
            this.key = n.key !== "" ? n.key : null; // Object key
            this.body = n.body !== "" ? n.body : null; // Body of the object to upload
            this.metadata = n.metadata !== "" ? n.metadata : null; // Metadata of the object
            this.contentType = n.contentType !== "" ? n.contentType : null; // Content-Type of the object
            
            // Checking for correct properties input
            if(!this.bucket) {
                this.bucket = msg.bucket ? msg.bucket : null;
                if(!this.bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            if(!this.key) {
                this.key = msg.key ? msg.key : null;
                if(!this.key) {
                    node.error('No object key provided!');
                    return;
                }
            }
            
            if(!this.body) {
                this.body = msg.body ? msg.body : null;
                if(!this.body) {
                    node.error('No body data provided to put in the object!');
                    return;
                }
            }

            if(!isString(this.body)) {
                node.error('The body should be formatted as string!');
                return;
            }

            if(!this.contentType) {
                this.contentType = msg.contentType ? msg.contentType : null;
                if(!this.contentType) {
                    node.error('No Content-Type provided!');
                    return;
                }
            }

            if(!this.metadata) {
                this.metadata = msg.metadata ? msg.metadata : null;
            }

            if(this.metadata) {
                if(!isJsonString(this.metadata)) {
                    if(!isObject(this.metadata)) {
                        node.error('The metadata should be of type Object!');
                        return;
                    }
                }

                if(!isObject(this.metadata)) {
                    this.metadata = JSON.parse(this.metadata);
                }
                
            }

            try {
                // Creating S3 client
                this.s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                // Converting body from string to stream
                // since the sdk requires stream for upload
                const streamifiedBody = stringToStream(this.body);
                if(!streamifiedBody) {
                    node.error('Failed to streamify body. Body needs to be a string!');
                    done();
                    return;
                }

                // Calculating MD5 od the body
                const MD5 = crypto.createHash('md5').update(this.body).digest("hex");

                // Fetching HeadData (Metadata) for the object that is being upserted or inserted
                let objectMeta = {};
                try{
                    objectMeta = await this.s3Client.headObject({
                        Bucket: this.bucket,
                        Key: this.key
                    });
                    let ETag = objectMeta.ETag.substring(1, objectMeta.ETag.length - 1); // Formatting the ETag
                    
                    // Checking if the existing object data is exactly the same as the request message
                    if(ETag == MD5) {
                        node.warn(`The object ${this.key} has not been upserted since the body of the existing object is exactly the same`);
                        this.s3Client.destroy();
                        done();
                        return;
                    }
                } catch (e) {
                    // If the object does not exist, continue with inserting
                }


                // Creating the upload object
                let objectToCreate = {
                    Bucket: this.bucket,
                    Key: this.key,
                    ContentType: this.contentType,
                    Body: streamifiedBody
                };
                
                if(this.metadata) objectToCreate.Metadata = this.metadata;

                // Uploading
                node.status({fill:"blue",shape:"dot",text:"Uploading"});
                const response = await this.s3Client.putObject(objectToCreate);

                // Formatting and returning the response
                delete response.$metadata;
                node.send({
                    payload: response
                });

                // Finalize
                this.s3Client.destroy();
                done();

                node.status({fill:"green",shape:"dot",text:`Success`});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                this.s3Client.destroy();
                done();

                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }
        });
    }

    RED.nodes.registerType('Put Object', S3PutObject);

    // Put Objects
    function S3PutObjects(n) {
        RED.nodes.createNode(this,n); // Getting options for the current node
        this.conf = RED.nodes.getNode(n.conf); // Getting configuration
        var node = this; // Referencing the current node
        var config = this.conf ? this.conf : null; // Cheking if the conf is valid
        this.objects = n.objects != "" ? n.objects : null; // Bucket info

        // If there is no conifg
        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input', async function(msg, send, done) {
            
            // Checking for correct properties input
            if(!this.objects) {
                this.objects = msg.objects ? msg.objects : null;
                
                if(!isJsonString(this.objects)) {
                    if(!Array.isArray(this.objects)) {
                        node.error('Invalid objects input format!');
                        return;
                    }
                }

                if(isJsonString(this.objects))
                    this.objects = JSON.parse(this.objects);

                if(!Array.isArray(this.objects)) {
                    node.error('The provided input for objects is not an array!');
                    return;
                }

                if(!isValidInputObjectArray(this.objects)) {
                    node.error('The provided array\'s objects are not in valid format!');
                    return;
                }
            }

            try {
                // Creating S3 client
                this.s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                // Creating the upload object
                let inputObjects = this.objects;
                // let inputObjects = createS3formatInputObjectArray(this.objects);
                let objectsToPut = [];

                node.status({fill:"blue",shape:"dot",text:"Comparison 0%"});
                for(let i = 0; i < inputObjects.length; i++) {
                    node.status({fill: "blue", shape: "dot", text: `Comparison ${parseInt((i/inputObjects.length) * 100)}%`});
                    try {
                        let objectMeta = await this.s3Client.headObject({
                            Bucket: inputObjects[i].bucket,
                            Key: inputObjects[i].key
                        });
                        
                        let ETag = objectMeta.ETag.substring(1, objectMeta.ETag.length - 1); // Formatting the ETag
                        const MD5 = crypto.createHash('md5').update(inputObjects[i].body).digest("hex");     

                        // Checking if the existing object data is exactly the same as the request message
                        if(ETag != MD5) {
                            objectsToPut.push(inputObjects[i]);
                        }

                    } catch (e) {
                        objectsToPut.push(inputObjects[i]);
                    }
                }

                objectsToPut = createS3formatInputObjectArray(objectsToPut);
                
                // Uploading
                node.status({fill:"blue",shape:"dot",text:"Uploading 0%"});
                let responses = [];
                for(let i = 0; i < objectsToPut.length; i++) {
                    // node.warn(objectsToPut[i])
                    let response = await this.s3Client.putObject(objectsToPut[i]);
                    response.Key = objectsToPut[i].Key;
                    responses.push(response)
                    node.status({fill: "blue", shape: "dot", text: `Uploading ${parseInt((i/objectsToPut.length) * 100)}%`});
                }

                // Formatting and returning the response
                send({
                    payload: responses
                });

                // Finalize
                this.s3Client.destroy();
                done();

                node.status({fill:"green",shape:"dot",text:`Success`});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                this.s3Client.destroy();
                done();

                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }
        });
    }

    RED.nodes.registerType('Put Objects', S3PutObjects);

    // Delete object
    function S3DeleteObject(n) {
        RED.nodes.createNode(this,n); // Getting options for the current node
        this.conf = RED.nodes.getNode(n.conf); // Getting configuration
        var node = this; // Referencing the current node
        var config = this.conf ? this.conf : null; // Cheking if the conf is valid
        this.bucket = n.bucket != "" ? n.bucket : null; // Bucket info
        this.key = n.key != "" ? n.key : null; // Object key


        // If there is no conifg
        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }


        this.on('input',  async function(msg, send, done) {

            // Checking for correct properties input
            if(!this.bucket) {
                this.bucket = msg.bucket ? msg.bucket : null;
                if(!this.bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            if(!this.key) {
                this.key = msg.key ? msg.key : null;
                if(!this.key) {
                    node.error('No object key provided!');
                    return;
                }
            }


            try {
                // Creating S3 client
                this.s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Deleting"});
                const response = await this.s3Client.deleteObject({
                    Bucket: this.bucket,
                    Key: this.key
                });

                // delete response.$metadata;
                let responseMsg = `Done! Key: ${this.key}`;

                send({
                    payload: responseMsg
                })
                
                node.status({fill:"yellow",shape:"dot",text:`Done!`});
                // Finalize
                this.s3Client.destroy();
                done();

                setTimeout(() => {
                    node.status({});
                }, 3000);
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                this.s3Client.destroy();
                done();

                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }

        })

    }

    RED.nodes.registerType('Delete Object', S3DeleteObject);

    // Create bucket
    function S3CreateBucket(n) {
        RED.nodes.createNode(this,n); // Getting options for the current node
        this.conf = RED.nodes.getNode(n.conf); // Getting configuration
        var node = this; // Referencing the current node
        var config = this.conf ? this.conf : null; // Cheking if the conf is valid
        this.bucket = n.bucket != "" ? n.bucket : null; // Bucket info

        // If there is no conifg
        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input',  async function(msg, send, done) {

            // Checking for correct properties input
            if(!this.bucket) {
                this.bucket = msg.bucket ? msg.bucket : null;
                if(!this.bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            try {
                // Creating S3 client
                this.s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                // Creating bucket
                node.status({fill:"blue",shape:"dot",text:"Creating Bucket"});
                const response = await this.s3Client.createBucket({
                    Bucket: this.bucket
                })

                // Returning response
                delete response.$metadata;
                send({
                    payload: response
                })
                
                node.status({fill:"green",shape:"dot",text:`Created!`});
                // Finalize
                this.s3Client.destroy();
                done();

                setTimeout(() => {
                    node.status({});
                }, 3000);
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                this.s3Client.destroy();
                done();

                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }

        })
    }

    RED.nodes.registerType('Create Bucket', S3CreateBucket);

    // Function node
};
