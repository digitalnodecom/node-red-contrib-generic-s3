module.exports = function S3ListBuckets(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("List Buckets", nodeInstance);
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
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    const { S3 } = require("@aws-sdk/client-s3");
    // msg object clone
    const msgClone = structuredClone(msg);

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
      const result = await s3Client.listBuckets({});
      // Append the result to msg.payload
      msgClone.payload = result;
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
