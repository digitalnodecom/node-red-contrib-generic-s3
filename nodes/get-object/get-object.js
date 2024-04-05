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
    // Stringify body
    const stringifyBody = {
      string: false,
      base64: false,
    };

    // Checking for correct properties input
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

    // Key parameter
    let key = n.key != "" ? n.key : null;
    if (!key) {
      key = msgClone.key ? msgClone.key : null;
      if (!key) {
        this.error("No object key provided!");
        return;
      }
    }
    payloadConfig.Key = key;

    // Version ID parameter
    let versionid = n.versionid != "" ? n.versionid : null;
    if (!versionid) {
      versionid = msgClone.versionid ? msgClone.versionid : null;
    }
    payloadConfig.VersionId = versionid;

    // Stringify body parameter
    let stringifybody = n.stringifybody ? n.stringifybody : false;
    if (!stringifybody) {
      stringifybody = msgClone.stringifybody ? msgClone.stringifybody : false;
    }
    stringifyBody.string = stringifybody;

    // StringifyBody base 64 encoding parameter
    let stringifybodybase64 = n.stringifybodybase64
      ? n.stringifybodybase64
      : false;
    if (!stringifybodybase64) {
      stringifybodybase64 = msgClone.stringifybodybase64
        ? msgClone.stringifybodybase64
        : false;
    }
    stringifyBody.base64 = stringifybodybase64;

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
      msgClone.payload = result;
      // Append the object
      // key to the message object
      msgClone.key = payloadConfig.Key;

      // Return the complete message object
      send(msgClone);
      this.status({ fill: "green", shape: "dot", text: "Success" });
    } catch (err) {
      // If error occurs
      this.status({ fill: "red", shape: "dot", text: "Failure" });
      // Replace the payload with null
      msgClone.payload = null;
      msgClone.error = err;
      // Append the object
      // key to the message object
      msgClone.key = payloadConfig.Key;
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
