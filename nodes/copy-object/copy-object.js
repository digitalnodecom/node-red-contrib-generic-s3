module.exports = function S3CopyObject(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Copy Object", nodeInstance);
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
    // Copy source
    this.copysource = n.copysource != "" ? n.copysource : null;
    // Version ID
    this.versionid = n.versionid != "" ? n.versionid : null;
    // ContentEncoding parameter
    this.contentencoding = n.contentencoding != "" ? n.contentencoding : null;
    // ACL parameter
    this.acl = n.acl && n.acl !== "" ? n.acl : null;
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    // Imports
    const { S3 } = require("@aws-sdk/client-s3");
    const {
      isValidContentEncoding,
      isValidACL,
    } = require("../../common/common");

    /**
     * Create a payloadConfig object containing parameters to be sent to S3 API
     * https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
     */
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

    // Key parameter
    if (!n.key) {
      n.key = msg.key ? msg.key : null;
      if (!n.key) {
        this.error("No object key provided!");
        return;
      }
    }
    payloadConfig.Key = n.key;

    // copy source parameter
    if (!n.copysource) {
      n.copysource = msg.copysource ? msg.copysource : null;
      if (!n.copysource) {
        this.error("No Copy Source provided!");
        return;
      }
    }

    // versionId parameter
    if (!n.versionid) {
      n.versionid = msg.versionid ? msg.versionid : null;
    }

    if (n.versionid) {
      payloadConfig.CopySource = encodeURI(
        `${copysource}?versionId=${encodeURIComponent(n.versionid)}`
      );
    } else {
      payloadConfig.CopySource = encodeURI(n.copysource);
    }

    // ContentEncoding parameter
    if (!n.contentencoding) {
      n.contentencoding = msg.contentencoding ? msg.contentencoding : null;
      if (n.contentencoding && !isValidContentEncoding(n.contentencoding)) {
        this.error("Invalid content encoding!");
        return;
      }
    }
    payloadConfig.ContentEncoding = n.contentencoding;

    // ACL parameter
    if (!n.acl) {
      n.acl = msg.acl ? msg.acl : null;
      if (n.acl && !isValidACL(n.acl)) {
        this.error("Invalid ACL permissions value");
        return;
      }
    }
    payloadConfig.ACL = n.acl;

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

      this.status({ fill: "blue", shape: "dot", text: "Copying" });
      // List all objects from the desired bucket
      let result = await s3Client.copyObject(payloadConfig);
      // Append the result to msg.payload
      msg.payload = result;
      // Append the bucket to
      // the message object
      msg.bucket = payloadConfig.Bucket;
      send(msg);
      this.status({ fill: "green", shape: "dot", text: "Success" });
    } catch (err) {
      // If error occurs
      this.error(err);
      msg.error = err;
      msg.payload = null;
      msg.bucket = payloadConfig.Bucket;
      send(msg);
      this.status({ fill: "red", shape: "dot", text: "Failure" });
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
