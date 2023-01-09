module.exports = function(RED) {
    "use strict";
    const { S3 } = require('@aws-sdk/client-s3');

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
                        send({payload: null, key: key});
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
}