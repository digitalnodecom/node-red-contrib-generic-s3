module.exports = function (RED) {
  "use strict";
  const { S3 } = require("@aws-sdk/client-s3");

  // LIST BUCKETS NODE
  function S3ListBuckets(n) {
    RED.nodes.createNode(this, n); // Getting options for the current node
    this.conf = RED.nodes.getNode(n.conf); // Getting configuration
    var node = this; // Referencing the current node
    var config = this.conf ? this.conf : null; // Cheking if the conf is valid

    if (!config) {
      node.warn(RED._("Missing S3 Client Configuration!"));
      return;
    }

    // Make the handler for the input event async
    this.on("input", async function (msg, send, done) {
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

        node.status({ fill: "blue", shape: "dot", text: "Fetching" });
        // Listing all the buckets and formatting the message
        s3Client.listBuckets({}, function (err, data) {
          if (err) {
            node.status({ fill: "red", shape: "dot", text: `Failure` });
            node.error(err);
            // Replace the payload with null
            msg.payload = null;

            // Return the complete message object
            send(msg);
          } else {
            // Replace the payload with
            // the returned data
            msg.payload = data;

            // Return the complete message object
            send(msg);
          }
          // Finalizing
          if (done) {
            s3Client.destroy();
            done();
          }

          node.status({ fill: "green", shape: "dot", text: "Success" });
          setTimeout(() => {
            node.status({});
          }, 2000);
        });
      } catch (err) {
        // If an error occurs
        node.error(err);
        // Cleanup
        if (s3Client !== null) s3Client.destroy();
        if (done) done();

        node.status({ fill: "red", shape: "dot", text: "Failure" });
        setTimeout(() => {
          node.status({});
        }, 3000);
      }
    });
  }

  RED.nodes.registerType("List Buckets", S3ListBuckets);
};
