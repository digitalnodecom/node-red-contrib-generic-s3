module.exports = function S3DeleteObject(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Delete Object", nodeInstance);
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
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    const { S3 } = require("@aws-sdk/client-s3");
    // msg object clone
    const msgClone = structuredClone(msg);

    // Bucket parameter
    let bucket = n.bucket != "" ? n.bucket : null;
    if (!bucket) {
      bucket = msgClone.bucket ? msgClone.bucket : null;
      if (!bucket) {
        this.error("No bucket provided!");
        return;
      }
    }

    // Key parameter
    let key = n.key != "" ? n.key : null;
    if (!key) {
      key = msgClone.key ? msgClone.key : null;
      if (!key) {
        this.error("No object key provided!");
        return;
      }
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

      this.status({ fill: "blue", shape: "dot", text: "Deleting" });
      const result = await s3Client.deleteObject({
        Bucket: bucket,
        Key: key,
      });
      // Replace the payload with
      // the returned data
      msgClone.payload = result;
      // Append the deleted object
      // key to the message object
      msgClone.key = key;
      send(msgClone);
    } catch (err) {
      // If error occurs
      msgClone.error = err;
      msgClone.payload = null;
      msgClone.key = key;
      this.error(err, msgClone);
      send(msg);
      this.status({ fill: "red", shape: "dot", text: "Failure" });
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
