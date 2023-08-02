module.exports = function (RED) {
  "use strict";
  const { S3 } = require("@aws-sdk/client-s3");
  const { isValidContentEncoding } = require("../../common/common");

  // Move Object
  function S3MoveObject(n) {
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
      let bucket = n.bucket !== "" ? n.bucket : null; // Destination bucket
      let key = n.key !== "" ? n.key : null; // Destination object key
      let sourcekey = n.sourcekey !== "" ? n.sourcekey : null; // Source bucket
      let sourcebucket = n.sourcebucket !== "" ? n.sourcebucket : null; // Source object key
      const msgClone = structuredClone(msg);

      // Checking for correct properties input
      if (!bucket) {
        bucket = msgClone.bucket ? msgClone.bucket : null;
        if (!bucket) {
          node.error("No bucket provided!");
          return;
        }
      }

      if (!key) {
        key = msgClone.key ? msgClone.key : null;
        if (!key) {
          node.error("No object key provided!");
          return;
        }
      }

      if (!sourcebucket) {
        sourcebucket = msgClone.sourcebucket ? msgClone.sourcebucket : null;
        if (!sourcebucket) {
          node.error("No sourcebucket provided!");
          return;
        }
      }

      if (!sourcekey) {
        sourcekey = msgClone.sourcekey ? msgClone.sourcekey : null;
        if (!sourcekey) {
          node.error("No sourcekey provided!");
          return;
        }
      }

      // ContentEncoding parameter
      let contentencoding = n.contentencoding != "" ? n.contentencoding : null;
      if (!contentencoding) {
        contentencoding = msgClone.contentencoding ? msgClone.contentencoding : null;
      }
      if (contentencoding && !isValidContentEncoding(contentencoding)) {
        node.error("Invalid content encoding!");
        return;
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

        // Uploading
        node.status({
          fill: "blue",
          shape: "dot",
          text: "Copying...",
        });

        // Object move is actually two step process
        // 1. The object is copied from the specified source bucket to destination bucket with the specified key
        // 2. Then the source object is removed from the source bucket
        s3Client.copyObject(
          {
            CopySource: encodeURI(sourcebucket + "/" + sourcekey),
            Bucket: bucket,
            Key: key,
            ContentEncoding: contentencoding
          },
          function (err, data) {
            if (err) {
              // Show error message
              node.status({
                fill: "red",
                shape: "dot",
                text: "Failure",
              });

              node.error(err, msgClone);
            } else {
              // If the object copying was successful
              // then proceed to deleting it from the source bucket
              s3Client.deleteObject(
                { Bucket: sourcebucket, Key: sourcekey },
                function (deleteErr, deleteData) {
                  if (deleteErr) {
                    node.status({ fill: "red", shape: "dot", text: `Failure` });
                    node.error(deleteErr);
                    // Replace the payload with null
                    msgClone.payload = null;
                    // Append the delete object
                    // key to the message object
                    msgClone.key = key;

                    // Return the complete message object
                    send(msgClone);
                  } else {
                    // Replace the payload with
                    // the returned data from the copyObject response
                    msgClone.payload = data;
                    // Append the moved object
                    // key to the message object
                    msgClone.key = key;

                    send(msgClone);
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
            }
          }
        );
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

  RED.nodes.registerType("Move Object", S3MoveObject);
};
