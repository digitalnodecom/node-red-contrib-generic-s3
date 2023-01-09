module.exports = function(RED) {
    "use strict";
    const { S3 } = require('@aws-sdk/client-s3');
    const { isString, isJsonString, isObject, stringToStream } = require('../../common/common');
    const crypto = require('crypto');

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
            let upsert = n.upsert ? n.upsert : false;


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

            if(!upsert) {
                upsert = msg.upsert ? msg.upsert : false;
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

                if(upsert) {
                    // Calculating MD5 od the body
                    const MD5 = crypto.createHash('md5').update(body).digest("hex");

                    // Fetching HeadData (Metadata) for the object that is being upserted or inserted
                    try{
                        s3Client.headObject({ Bucket: bucket, Key: key }, function(err, data) {
                            if(err) {
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
                                        send({payload: null, key: key});
                                    } else {  // if not, return message with the payload
                                        send({
                                            payload: data,
                                            key: key
                                        });
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
                            } else {
                                let ETag = data.ETag.substring(1, data.ETag.length - 1); // Formatting the ETag
                                // Checking if the existing object data is exactly the same as the request message
                                if(ETag == MD5) {
                                    node.warn(`The object ${key} has not been upserted since the body of the existing object is exactly the same`);
                                    send({payload: null, key: key});
                                    if(done) done();
                                    return;
                                } else {
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
                                            send({payload: null, key: key});
                                        } else {  // if not, return message with the payload
                                            send({
                                                payload: data,
                                                key: key
                                            });
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
                            }
                        });

                    } catch (err) {
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
                } else {
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
                            send({payload: null, key: key});
                        } else {  // if not, return message with the payload
                            send({
                                payload: data,
                                key: key
                            });
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
}