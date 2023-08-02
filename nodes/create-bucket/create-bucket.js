module.exports = function (RED) {
  "use strict";
  const { S3 } = require("@aws-sdk/client-s3");

  // Create bucket
  function S3CreateBucket(n) {
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
      const msgClone = structuredClone(msg);

      // Checking for correct properties input
      if (!bucket) {
        bucket = msgClone.bucket ? msgClone.bucket : null;
        if (!bucket) {
          node.error("No bucket provided!");
          return;
        }
      }

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

        // Creating bucket
        node.status({ fill: "blue", shape: "dot", text: "Creating Bucket" });
        s3Client.createBucket({ Bucket: bucket }, function (err, data) {
          if (err) {
            node.status({ fill: "red", shape: "dot", text: `Failure` });
            node.error(err, msgClone);
            // Replace the payload with null
            msgClone.payload = null;
            // Append the bucket to
            // the message object
            msgClone.bucket = bucket;

            // Return the complete message object
            send(msgClone);
          } else {
            // Replace the payload with
            // the returned data
            msgClone.payload = data;
            // Append the bucket to
            // the message object
            msgClone.bucket = bucket;

            // Return the complete message object
            send(msgClone);

            node.status({ fill: "green", shape: "dot", text: "Success" });
          }

          node.status({ fill: "green", shape: "dot", text: `Created!` });
          // Finalize
          if (done) {
            s3Client.destroy();
            done();
          }

          setTimeout(() => {
            node.status({});
          }, 3000);
        });
      } catch (err) {
        // If error occurs
        node.error(err, msgClone);
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

  RED.nodes.registerType("Create Bucket", S3CreateBucket);
};
