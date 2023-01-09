module.exports = function(RED) {
    "use strict";
    const { S3 } = require('@aws-sdk/client-s3');

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

            /**
             * Create a payloadConfig object containing parameters to be sent to S3 API
             * https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html#API_ListObjectsV2_RequestSyntax
             */
            let payloadConfig = {};

            // Bucket parameter
            let bucket = n.bucket != "" ? n.bucket : null;
            if(!bucket) {
                bucket = msg.bucket ? msg.bucket : null;
                if(!bucket) {
                    node.error('No bucket provided!');
                    return;
                }
            }
            payloadConfig.Bucket = bucket;

            // max-keys parameter
            let maxkeys = n.maxkeys != "" ? Number(n.maxkeys) : null;
            if(!maxkeys) {
                maxkeys = msg.maxkeys ? msg.maxkeys : null;
            }
            if(maxkeys) {
                if(!Number.isInteger(maxkeys)) {
                    node.error('The maxkeys should be of type Integer!');
                    return;
                } else {
                    if(maxkeys <= 0) {
                        node.error('The maxkeys properties should be positive number!');
                        return;
                    }
                    payloadConfig.MaxKeys = maxkeys;
                }
            }

            // marker parameter
            let marker = n.marker != "" ? n.marker : null;
            if(!marker) {
                marker = msg.marker ? msg.marker : null;
            }
            if(marker) {
                payloadConfig.Marker = marker
            }

            // prefix parameter
            let prefix = n.prefix != "" ? n.prefix : null;
            if(!prefix) {
                prefix = msg.prefix ? msg.prefix : null;
            }
            if(prefix) {
                payloadConfig.Prefix = prefix
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
                s3Client.listObjects(payloadConfig, function(err, data) {
                    if(err) {
                        node.status({fill:"red",shape:"dot",text:`Failure`});
                        node.error(err);
                        send({payload: null, bucket: bucket});
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

}