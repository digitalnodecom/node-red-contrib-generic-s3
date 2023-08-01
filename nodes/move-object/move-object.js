module.exports = function S3MoveObject(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Move Object", nodeInstance);
};

function instanceNode(RED) {
  return function nodeInstance(n) {
    RED.nodes.createNode(this, n); // Getting options for the current node
    this.conf = RED.nodes.getNode(n.conf); // Getting configuration
    let config = this.conf ? this.conf : null; // Cheking if the conf is valid
    if (!config) {
      this.warn(RED._("Missing S3 Client Configuration!"));
      return;
    }
    // Bucket parameter
    this.bucket = n.bucket != "" ? n.bucket : null;
    // Destination object key parameter
    this.key = n.key !== "" ? n.key : null;
    // Source object key
    this.sourcekey = n.sourcekey !== "" ? n.sourcekey : null;
    // Source bucket
    this.sourcebucket = n.sourcebucket !== "" ? n.sourcebucket : null;
    // ContentEncoding parameter
    this.contentencoding = n.contentencoding != "" ? n.contentencoding : null;
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    // Imports
    const { S3 } = require("@aws-sdk/client-s3");
    const { isValidContentEncoding } = require("../../common/common");

    // Checking for correct properties input
    if (!n.bucket) {
      n.bucket = msg.bucket ? msg.bucket : null;
      if (!n.bucket) {
        this.error("No bucket provided!");
        return;
      }
    }

    if (!n.key) {
      n.key = msg.key ? msg.key : null;
      if (!n.key) {
        this.error("No object key provided!");
        return;
      }
    }

    if (!n.sourcebucket) {
      n.sourcebucket = msg.sourcebucket ? msg.sourcebucket : null;
      if (!n.sourcebucket) {
        this.error("No sourcebucket provided!");
        return;
      }
    }

    if (!n.sourcekey) {
      n.sourcekey = msg.sourcekey ? msg.sourcekey : null;
      if (!n.sourcekey) {
        this.error("No sourcekey provided!");
        return;
      }
    }

    if (!n.contentencoding) {
      n.contentencoding = msg.contentencoding ? msg.contentencoding : null;
    }
    if (n.contentencoding && !isValidContentEncoding(n.contentencoding)) {
      this.error("Invalid content encoding!");
      return;
    }

    // S3 client init
    let s3Client = null;
    try {
      // Creating S3 client
      s3Client = new S3({
        endpoint: n.conf.endpoint,
        forcePathStyle: n.conf.forcepathstyle,
        region: n.conf.region,
        credentials: {
          accessKeyId: n.conf.credentials.accesskeyid,
          secretAccessKey: n.conf.credentials.secretaccesskey,
        },
      });

      // Uploading
      this.status({
        fill: "blue",
        shape: "dot",
        text: "Copying...",
      });

      // Object move is actually two step process
      // 1. The object is copied from the specified source bucket to destination bucket with the specified key
      // 2. Then the source object is removed from the source bucket
      await s3Client.copyObject({
        CopySource: encodeURI(n.sourcebucket + "/" + n.sourcekey),
        Bucket: n.bucket,
        Key: n.key,
        ContentEncoding: n.contentencoding,
      });
      const result = await s3Client.deleteObject({
        Bucket: n.sourcebucket,
        Key: n.sourcekey,
      });
      msg.payload = result;
      // Return the complete message object
      send(msg);
      this.status({ fill: "green", shape: "dot", text: "Success" });
    } catch (err) {
      // If error occurs
      this.error(err);
      this.status({ fill: "red", shape: "dot", text: "Failure" });
      // Replace the payload with null
      msg.payload = null;
      msg.error = err;
      send(msg);
    } finally {
      if(s3Client) s3Client.destroy();
      /* Dereference vars */
      s3Client = null;
      /*********************/
      setTimeout(() => {
        this.status({});
      }, 3000);
      done();
    }
  };
}
