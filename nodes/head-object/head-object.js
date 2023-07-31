module.exports = function S3HeadObject(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Head Object", nodeInstance);
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
    // Key parameter
    this.key = n.key != "" ? n.key : null;
    // Version ID
    this.versionid = n.versionid != "" ? n.versionid : null;
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    // Imports
    const { S3 } = require("@aws-sdk/client-s3");

    // Configuration for client
    const payloadConfig = {};

    // Checking for correct properties input
    // Bucket parameter
    if (!n.bucket) {
      n.bucket = msg.bucket ? msg.bucket : null;
      if (!n.bucket) {
        this.error("No bucket provided!");
        return;
      }
    }
    payloadConfig.Bucket = n.bucket;

    // Key parameter
    if (!n.key) {
      n.key = msg.key ? msg.key : null;
      if (!n.key) {
        this.error("No object key provided!");
        return;
      }
    }
    payloadConfig.Key = n.key;

    // Version ID parameter
    if (!n.versionid) {
      payloadConfig.VersionId = msg.versionid ? msg.versionid : undefined;
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

      this.status({ fill: "blue", shape: "dot", text: "Fetching" });

      const result = await s3Client.headObject(payloadConfig);

      // Replace the payload with
      // the returned data
      msg.payload = result;
      // Append the object
      // key to the message object
      msg.key = payloadConfig.Key;

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
      // Append the object
      // key to the message object
      msg.key = payloadConfig.Key;
      send(msg);
    } finally {
      s3Client.destroy();
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
