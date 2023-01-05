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

            // S3 client init
            let s3Client = null;
            try {
                // Creating S3 client
                s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Fetching"});
                // Listing all the buckets and formatting the message
                const response = await s3Client.listBuckets({});
                delete response.$metadata;

                // Sending the message
                send({
                    payload: response
                });

                // Finalizing
                if(done) {
                    s3Client.destroy();
                    done();
                }

                node.status({fill:"green",shape:"dot",text:"Success"});
                setTimeout(() => {
                    node.status({});
                }, 2000);
            }
            catch (err) {
                // If an error occurs
                node.error(err);
                // Cleanup
                if(s3Client !== null) s3Client.destroy();
                if(done) done();
                
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
        

        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input', async function(msg, send, done) {
            let bucket = n.bucket != "" ? n.bucket : null;

            if(!bucket) {
                bucket = msg.bucket ? msg.bucket : null;
                if(!bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            // S3 client init
            let s3Client = null;
            try {
                // Creating S3 client
                s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Fetching"});
                // List all objects from the desired bucket
                s3Client.listObjects({ Bucket: bucket }, function(err, data) {
                    if(err) {
                        node.status({fill:"red",shape:"dot",text:`Failure`});
                        node.error(err);
                        node.send({payload: null, bucket: bucket});
                    } else {

                        send({
                            payload: data,
                            bucket: bucket
                        });
        
                        // Finalize
                        if(done) {
                            s3Client.destroy();
                            done();
                        }
        
                        node.status({fill:"green",shape:"dot",text:"Success"});
                        setTimeout(() => {
                            node.status({});
                        }, 2000);
                    }
                });

            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                if(s3Client !== null) s3Client.destroy();
                if(done) done();

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

        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input', async function(msg, send, done) {

            let bucket = n.bucket != "" ? n.bucket : null;
            let key = n.key != "" ? n.key : null;
            
            // Checking for correct properties input
            if(!bucket) {
                bucket = msg.bucket ? msg.bucket : null;
                if(!bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            if(!key) {
                key = msg.key ? msg.key : null;
                if(!key) {
                    node.error('No object key provided!');
                    return;
                }
            }

            // S3 client init
            let s3Client = null;
            try {
                // Creating S3 client
                s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Fetching"});

                s3Client.getObject({ Bucket: bucket, Key: key }, async function(err, data) {
                    // If an error occured, print the error
                    if(err) {
                        node.status({fill:"red",shape:"dot",text:`Failure`});
                        node.error(err);
                        node.send({payload: null, key: key});
                    } else { // if not, return message with the payload
        
                        send({
                            payload: data,
                            key: key
                        });
                        node.status({fill:"green",shape:"dot",text:"Success"});
                    }
    
                    // Finalize
                    if(done) {
                        s3Client.destroy();
                        done();
                    }
    
                    setTimeout(() => {
                        node.status({});
                    }, 2000);

                });

            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                if(s3Client !== null) s3Client.destroy();
                if(done) done();

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

            let bucket = n.bucket !== "" ? n.bucket : null; // Bucket info
            let key = n.key !== "" ? n.key : null; // Object key
            let body = n.body !== "" ? n.body : null; // Body of the object to upload
            let metadata = n.metadata !== "" ? n.metadata : null; // Metadata of the object
            let contentType = n.contentType !== "" ? n.contentType : null; // Content-Type of the object
            
            // Checking for correct properties input
            if(!bucket) {
                bucket = msg.bucket ? msg.bucket : null;
                if(!bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            if(!key) {
                key = msg.key ? msg.key : null;
                if(!key) {
                    node.error('No object key provided!');
                    return;
                }
            }
            
            if(!body) {
                body = msg.body ? msg.body : null;
                if(!body) {
                    node.error('No body data provided to put in the object!');
                    return;
                }
            }

            if(!isString(body)) {
                node.error('The body should be formatted as string!');
                return;
            }

            if(!contentType) {
                contentType = msg.contentType ? msg.contentType : null;
                if(!contentType) {
                    node.error('No Content-Type provided!');
                    return;
                }
            }

            if(!metadata) {
                metadata = msg.metadata ? msg.metadata : null;
            }

            if(metadata) {
                if(!isJsonString(metadata)) {
                    if(!isObject(metadata)) {
                        node.error('The metadata should be of type Object!');
                        return;
                    }
                }

                if(!isObject(metadata)) {
                    metadata = JSON.parse(metadata);
                }
                
            }

            // S3 client init
            let s3Client = null;

            try {

                // Creating S3 client
                s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                // Converting body from string to stream
                // since the sdk requires stream for upload
                const streamifiedBody = stringToStream(body);
                if(!streamifiedBody) {
                    node.error('Failed to streamify body. Body needs to be a string!');
                    if(done) {
                        s3Client.destroy();
                        done();
                    } 
                    return;
                }

                // Calculating MD5 od the body
                const MD5 = crypto.createHash('md5').update(body).digest("hex");

                // Fetching HeadData (Metadata) for the object that is being upserted or inserted
                let objectMeta = {};
                try{
                    objectMeta = await s3Client.headObject({
                        Bucket: bucket,
                        Key: key
                    });
                    let ETag = objectMeta.ETag.substring(1, objectMeta.ETag.length - 1); // Formatting the ETag
                    
                    // Checking if the existing object data is exactly the same as the request message
                    if(ETag == MD5) {
                        node.warn(`The object ${msg.key} has not been upserted since the body of the existing object is exactly the same`);
                        send({payload: null, key: msg.key});
                        if(done) done();
                        return;
                    }
                } catch (e) {
                    // If the object does not exist, continue with inserting
                }

                // Creating the upload object
                let objectToCreate = {
                    Bucket: bucket,
                    Key: key,
                    ContentType: contentType,
                    Body: streamifiedBody
                };
                
                if(metadata) objectToCreate.Metadata = metadata;

                // Uploading
                node.status({fill:"blue",shape:"dot",text:"Uploading"});
                s3Client.putObject(objectToCreate, function(error, data) {
                    // If an error occured, print the error
                    if(error) {
                        node.status({fill:"red",shape:"dot",text:`Failure`});
                        node.error(error);
                    } else {  // if not, return message with the payload
                        let response = {
                            payload: data,
                        }
                        response.payload.key = key;
                        send(response); 
                        node.status({fill:"green",shape:"dot",text:`Success`});
                    }

                    // Finalize
                    if(done) {
                        s3Client.destroy();
                        done();
                    }
                    // Clear node's status
                    setTimeout(() => {
                        node.status({});
                    }, 5000);
                });
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                if(s3Client !== null) s3Client.destroy();
                if(done) done();
                
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

        // If there is no conifg
        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input', async function(msg, send, done) {
            
            let objects = n.objects != "" ? n.objects : null; // Bucket info

            // Checking for correct properties input
            if(!objects) {
                objects = msg.objects ? msg.objects : null;
                
                if(!isJsonString(objects)) {
                    if(!Array.isArray(objects)) {
                        node.error('Invalid objects input format!');
                        return;
                    }
                }

                if(isJsonString(objects))
                    this.objects = JSON.parse(objects);

                if(!Array.isArray(objects)) {
                    node.error('The provided input for objects is not an array!');
                    return;
                }

                if(!isValidInputObjectArray(objects)) {
                    node.error('The provided array\'s objects are not in valid format!');
                    return;
                }
            }

            // S3 client init
            let s3Client = null;

            try {
                // Creating S3 client
                s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                // Creating the upload object
                let inputObjects = objects;
                // let inputObjects = createS3formatInputObjectArray(this.objects);
                let objectsToPut = [];

                node.status({fill:"blue",shape:"ring",text:"Comparison"});
                for(let i = 0; i < inputObjects.length; i++) {
                    node.status({fill: "blue", shape: "ring", text: `Comparison ${parseInt((i/inputObjects.length) * 100)}%`});
                    try {
                        let objectMeta = await s3Client.headObject({
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

                // Formatting the array into appropriate S3 SDK input array
                objectsToPut = createS3formatInputObjectArray(objectsToPut);

                if(objectsToPut.length == 0) {
                    send({payload: null});
                    node.warn('All of the objects are exactly the same as the already existing ones in the specified bucket!');
                    node.status({fill:"yellow",shape:"dot",text:"No objects uploaded!"});
                    
                    // Cleanup
                    if(done) {
                        s3Client.destroy();
                        done();
                    }

                    setTimeout(() => {
                        node.status({});
                    }, 5000);

                    return;
                }
                
                // Uploading
                node.status({fill:"blue",shape:"dot",text:"Uploading"});
                let responses = [];
                for(let i = 0; i < objectsToPut.length; i++) {
                    let response = {
                        payload: {},
                        key: objectsToPut[i].Key
                    }
                    response.payload = await s3Client.putObject(objectsToPut[i]);
                    responses.push(response)
                    node.status({fill: "blue", shape: "dot", text: `Uploading ${parseInt((i/objectsToPut.length) * 100)}%`});
                }

                // Formatting and returning the response
                send({
                    payload: responses
                });

                // Finalize
                if(done) {
                    s3Client.destroy();
                    done();
                }

                node.status({fill:"green",shape:"dot",text:`Success`});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                if(s3Client !== null) s3Client.destroy();
                if(done) done();

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


        // If there is no conifg
        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }


        this.on('input',  async function(msg, send, done) {
            let bucket = n.bucket != "" ? n.bucket : null; // Bucket info
            let key = n.key != "" ? n.key : null; // Object key

            // Checking for correct properties input
            if(!bucket) {
                bucket = msg.bucket ? msg.bucket : null;
                if(!bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            if(!key) {
                key = msg.key ? msg.key : null;
                if(!key) {
                    node.error('No object key provided!');
                    return;
                }
            }

            // S3 client init
            let s3Client = null;
            try {
                // Creating S3 client
                s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                node.status({fill:"blue",shape:"dot",text:"Deleting"});
                s3Client.deleteObject({ Bucket: bucket, Key: key }, function(err, data) {
                    if(err) {
                        node.status({fill:"red",shape:"dot",text:`Failure`});
                        node.error(err);
                        node.send({payload: null, key: key});
                    } else {
                        send({
                            payload: data,
                            key: key
                        });
                    }

                    node.status({fill:"green",shape:"dot",text:`Done!`});
                    // Finalize
                    if(done) {
                        s3Client.destroy();
                        done();
                    }
    
                    setTimeout(() => {
                        node.status({});
                    }, 3000);
                });

            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                if(s3Client !== null) s3Client.destroy();
                if(done) done();

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

        // If there is no conifg
        if (!config) {
            node.warn(RED._("Missing S3 Client Configuration!"));
            return;
        }

        this.on('input',  async function(msg, send, done) {

            let bucket = n.bucket != "" ? n.bucket : null; // Bucket info
            // Checking for correct properties input
            if(!bucket) {
                bucket = msg.bucket ? msg.bucket : null;
                if(!bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }

            let s3Client = null;
            try {
                // Creating S3 client
                s3Client = new S3({
                    endpoint: config.endpoint,
                    region: config.region,
                    credentials: {
                        accessKeyId: config.credentials.accesskeyid,
                        secretAccessKey: config.credentials.secretaccesskey
                    }
                });

                // Creating bucket
                node.status({fill:"blue",shape:"dot",text:"Creating Bucket"});
                s3Client.createBucket({ Bucket: bucket }, function(err, data) {
                    if(err) {
                        node.status({fill:"red",shape:"dot",text:`Failure`});
                        node.error(err);
                        send({payload: null, bucket: bucket});
                    } else {
                        send({
                            payload: data,
                            bucket: bucket
                        })
                        node.status({fill:"green",shape:"dot",text:"Success"});
                    }

                    node.status({fill:"green",shape:"dot",text:`Created!`});
                    // Finalize
                    if(done) {
                        s3Client.destroy();
                        done();
                    }
    
                    setTimeout(() => {
                        node.status({});
                    }, 3000);
                });

            }
            catch (err) {
                // If error occurs
                node.error(err);
                // Cleanup
                if(s3Client !== null) s3Client.destroy();
                if(done) done();

                node.status({fill:"red",shape:"dot",text:"Failure"});
                setTimeout(() => {
                    node.status({});
                }, 5000);
            }

        })
    }

    RED.nodes.registerType('Create Bucket', S3CreateBucket);
};
