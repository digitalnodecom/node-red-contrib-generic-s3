module.exports = function S3GetObject(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Get Object", nodeInstance);
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
    // Stringify body parameter
    this.stringifybody = n.stringifybody ? n.stringifybody : false;
    // Stringify body as Base64 parameter
    this.stringifybodybase64 = n.stringifybodybase64
      ? n.stringifybodybase64
      : false;
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    // Imports
    const { S3 } = require("@aws-sdk/client-s3");
    const { Readable } = require("stream");
    const { bufferToString, streamToBuffer } = require("../../common/common");

    // Configuration for client
    const payloadConfig = {};
    // Stringify body
    const stringifyBody = {
      string: false,
      base64: false,
    };

    // Checking for correct properties input
    // Bucket parameter
    if (!n.Bucket) {
      n.Bucket = msg.bucket ? msg.bucket : null;
      if (!n.Bucket) {
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
    if (!n.VersionId) {
      payloadConfig.VersionId = msg.versionid ? msg.versionid : null;
    }

    // Stringify body parameter
    if (!n.stringifybody) {
      n.stringifybody = msg.stringifybody ? msg.stringifybody : false;
    }
    stringifyBody.string = n.stringifybody;

    // StringifyBody base 64 encoding parameter
    if (!n.stringifybodybase64) {
      n.stringifybodybase64 = msg.stringifybodybase64
        ? msg.stringifybodybase64
        : false;
    }
    stringifyBody.base64 = n.stringifybodybase64;

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

      let result = await s3Client.getObject(payloadConfig);
      // Converting stream to buffer so it can be reused
      const buffer = await streamToBuffer(result.Body);

      // Converting buffer(body) to 'utf-8' string if specified
      if (stringifyBody.string) {
        result.BodyAsString = bufferToString(buffer);
      }

      // Converting buffer(body) to 'base-64' string if specified
      if (stringifyBody.base64) {
        result.BodyAsStringBase64 = bufferToString(buffer, "base64");
      }

      // Creating new stream from the buffer so
      // it can be further processed if needed
      result.Body = Readable.from(buffer);

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
