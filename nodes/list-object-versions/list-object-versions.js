module.exports = function S3ListObjectVersions(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("List Object Versions", nodeInstance);
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
    // max-keys parameter
    this.maxkeys = n.maxkeys != "" ? Number(n.maxkeys) : null;
    // key-marker parameter
    this.keymarker = n.keymarker != "" ? n.keymarker : null;
    // versionID-marker parameter
    this.versionidmarker = n.versionidmarker != "" ? n.versionidmarker : null;
    // prefix parameter
    this.prefix = n.prefix != "" ? n.prefix : null;
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    const { S3 } = require("@aws-sdk/client-s3");

    // Configuration for client
    const payloadConfig = {};

    // Bucket parameter
    if (!n.bucket) {
      n.bucket = msg.bucket ? msg.bucket : null;
      if (!n.bucket) {
        this.error("No bucket provided!");
        return;
      }
    }
    payloadConfig.Bucket = n.bucket;

    // max-keys parameter
    if (!n.maxkeys) {
      n.maxkeys = msg.maxkeys ? msg.maxkeys : null;
    }
    if (n.maxkeys) {
      if (!Number.isInteger(n.maxkeys)) {
        this.error("The maxkeys should be of type Integer!");
        return;
      } else {
        if (n.maxkeys <= 0) {
          this.error("The maxkeys properties should be positive number!");
          return;
        }
        payloadConfig.MaxKeys = n.maxkeys;
      }
    }

    // marker parameter
    if (!n.keymarker) {
      n.keymarker = msg.keymarker ? msg.keymarker : null;
    }
    if (n.keymarker) {
      payloadConfig.KeyMarker = n.keymarker;
    }

    // marker parameter
    if (!n.versionidmarker) {
      n.versionidmarker = msg.versionidmarker ? msg.versionidmarker : null;
    }
    if (n.versionidmarker) {
      payloadConfig.VersionIdMarker = n.versionidmarker;
    }

    // prefix parameter
    if (!n.prefix) {
      n.prefix = msg.prefix ? msg.prefix : null;
    }
    if (n.prefix) {
      payloadConfig.Prefix = n.prefix;
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

      // List all object versions from the desired bucket
      const result = await s3Client.listObjectVersions(payloadConfig);
      msg.payload = result;
      msg.bucket = payloadConfig.Bucket;
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
      // Append the bucket
      // to the message object
      msg.bucket = payloadConfig.Bucket;
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
