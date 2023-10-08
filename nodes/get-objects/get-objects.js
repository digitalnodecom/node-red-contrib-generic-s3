module.exports = function S3GetObjects(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Get Objects", nodeInstance);
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
    // Objects parameter
    this.objects = n.objects != "" ? n.objects : null;
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    // Imports
    const { S3 } = require("@aws-sdk/client-s3");
    const { Readable } = require("stream");
    const { bufferToString, streamToBuffer, isArray, createS3formatGetObjects } = require("../../common/common");

    // msg object clone
    let msgClone;
    try {
      msgClone = structuredClone(msg);
    } catch (e) {
      msg.error = e;
      this.error(e, e);
      return;
    }

    // S3 client init
    let s3Client = null;
    try {
      // Creating an input payload
      let inputPayload = n.objects ? createS3formatGetObjects(JSON.parse(n.objects)) : createS3formatGetObjects(msgClone.objects);
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

      let results = [];

      for(let i = 0; i < inputPayload.length; i++) {
        let result = await s3Client.getObject(inputPayload[i].payload);
        const buffer = await streamToBuffer(result.Body);
        // Converting buffer(body) to 'utf-8' string if specified
        if (inputPayload[i].flags.stringifybody) {
          result.BodyAsString = bufferToString(buffer);
        }

        // Converting buffer(body) to 'base-64' string if specified
        if (inputPayload[i].flags.stringifybodybase64) {
          result.BodyAsStringBase64 = bufferToString(buffer, "base64");
        }

        // Creating new stream from the buffer so
        // it can be further processed if needed
        result.Body = Readable.from(buffer);

        results.push(result);
      }

      // Replace the payload with
      // the returned data
      msgClone.payload = results;

      // Return the complete message object
      send(msgClone);
      this.status({ fill: "green", shape: "dot", text: "Success" });
    } catch (err) {
      // If error occurs
      this.status({ fill: "red", shape: "dot", text: "Failure" });
      // Replace the payload with null
      msgClone.payload = null;
      msgClone.error = err;
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
