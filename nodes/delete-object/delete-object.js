module.exports = function (RED) {
  "use strict";
  const { S3 } = require("@aws-sdk/client-s3");

  // Delete object
  function S3DeleteObject(n) {
    RED.nodes.createNode(this, n); // Getting options for the current node
    this.conf = RED.nodes.getNode(n.conf); // Getting configuration
    var node = this; // Referencing the current node
    var config = this.conf ? this.conf : null; // Cheking if the conf is valid

    // If there is no conifg
    if (!config) {
      node.warn(RED._("Missing S3 Client Configuration!"));
      return;
    }

    this.on("input", async function (msg, send, done) {
      let bucket = n.bucket != "" ? n.bucket : null; // Bucket info
      let key = n.key != "" ? n.key : null; // Object key

      // Checking for correct properties input
      if (!bucket) {
        bucket = msg.bucket ? msg.bucket : null;
        if (!bucket) {
          node.error("No bucket provided!");
          return;
        }
      }

      if (!key) {
        key = msg.key ? msg.key : null;
        if (!key) {
          node.error("No object key provided!");
          return;
        }
      }

      // S3 client init
      let s3Client = null;
      try {
        // Creating S3 client
        s3Client = new S3({
          endpoint: config.endpoint,
          forcePathStyle: config.forcepathstyle,
          region: config.region,
          credentials: {
            accessKeyId: config.credentials.accesskeyid,
            secretAccessKey: config.credentials.secretaccesskey,
          },
        });

        node.status({ fill: "blue", shape: "dot", text: "Deleting" });
        s3Client.deleteObject(
          { Bucket: bucket, Key: key },
          function (err, data) {
            if (err) {
              node.status({ fill: "red", shape: "dot", text: `Failure` });
              node.error(err, msg);
              // Replace the payload with null
              msg.payload = null;
              // Append the delete object
              // key to the message object
              msg.key = key;

              // Return the complete message object
              send(msg);
            } else {
              // Replace the payload with
              // the returned data
              msg.payload = data;
              // Append the deleted object
              // key to the message object
              msg.key = key;

              send(msg);
            }

            node.status({ fill: "green", shape: "dot", text: `Done!` });
            // Finalize
            if (done) {
              s3Client.destroy();
              done();
            }

            setTimeout(() => {
              node.status({});
            }, 3000);
          }
        );
      } catch (err) {
        // If error occurs
        node.error(err, msg);
        // Cleanup
        if (s3Client !== null) s3Client.destroy();
        if (done) done();

        node.status({ fill: "red", shape: "dot", text: "Failure" });
        setTimeout(() => {
          node.status({});
        }, 5000);
      }
    });
  }

  RED.nodes.registerType("Delete Object", S3DeleteObject);
};
