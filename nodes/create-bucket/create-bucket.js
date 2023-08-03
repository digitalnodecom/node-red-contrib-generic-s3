module.exports = function S3CreateBucket(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Create Bucket", nodeInstance);
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
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    const { S3 } = require("@aws-sdk/client-s3");
    // msg object clone
    const msgClone = structuredClone(msg);

    // Checking for correct properties input
    let bucket = n.bucket != "" ? n.bucket : null;
    if (!bucket) {
      bucket = msgClone.bucket ? msgClone.bucket : null;
      if (!bucket) {
        this.error("No bucket provided!");
        return;
      }
    }

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
      // Creating bucket
      this.status({ fill: "blue", shape: "dot", text: "Creating Bucket" });
      const result = await s3Client.createBucket({ Bucket: bucket });
      // Append the result to msg.payload
      msgClone.payload = result;
      // Append the bucket to
      // the message object
      msgClone.bucket = bucket;
      send(msgClone);
      this.status({ fill: "green", shape: "dot", text: `Created!` });
    } catch (err) {
      // If error occurs
      msgClone.error = err;
      msgClone.payload = null;
      this.error(err, msgClone);
      send(msgClone);
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
