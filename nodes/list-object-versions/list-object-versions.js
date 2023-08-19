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

    // msg object clone
    let msgClone;
    try {
      msgClone = structuredClone(msg);
    } catch (e) {
      msg.error = e;
      this.error(e, e);
      return;
    }

    // Configuration for client
    const payloadConfig = {};

    // Bucket parameter
    let bucket = n.bucket != "" ? n.bucket : null;
    if (!bucket) {
      bucket = msgClone.bucket ? msgClone.bucket : null;
      if (!bucket) {
        this.error("No bucket provided!");
        return;
      }
    }
    payloadConfig.Bucket = bucket;

    // max-keys parameter
    let maxkeys = n.maxkeys != "" ? Number(n.maxkeys) : null;
    if (!maxkeys) {
      maxkeys = msgClone.maxkeys ? msgClone.maxkeys : null;
    }
    if (maxkeys) {
      if (!Number.isInteger(maxkeys)) {
        this.error("The maxkeys should be of type Integer!");
        return;
      } else {
        if (maxkeys <= 0) {
          this.error("The maxkeys properties should be positive number!");
          return;
        }
        payloadConfig.MaxKeys = maxkeys;
      }
    }

    // marker parameter
    let keymarker = n.keymarker != "" ? n.keymarker : null;
    if (!keymarker) {
      keymarker = msgClone.keymarker ? msgClone.keymarker : null;
    }
    if (keymarker) {
      payloadConfig.KeyMarker = keymarker;
    }

    // marker parameter
    let versionidmarker = n.versionidmarker != "" ? n.versionidmarker : null;
    if (!versionidmarker) {
      versionidmarker = msgClone.versionidmarker
        ? msgClone.versionidmarker
        : null;
    }
    if (versionidmarker) {
      payloadConfig.VersionIdMarker = versionidmarker;
    }

    // prefix parameter
    let prefix = n.prefix != "" ? n.prefix : null;
    if (!prefix) {
      prefix = msgClone.prefix ? msgClone.prefix : null;
    }
    if (prefix) {
      payloadConfig.Prefix = prefix;
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
      msgClone.payload = result;
      msgClone.bucket = payloadConfig.Bucket;
      // Return the complete message object
      send(msgClone);
      this.status({ fill: "green", shape: "dot", text: "Success" });
    } catch (err) {
      // If error occurs
      this.status({ fill: "red", shape: "dot", text: "Failure" });
      // Replace the payload with null
      msgClone.payload = null;
      msgClone.error = err;
      // Append the bucket
      // to the message object
      msgClone.bucket = payloadConfig.Bucket;
      this.error(err, msgClone);
      send(msgClone);
    } finally {
      if (s3Client) s3Client.destroy();
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
