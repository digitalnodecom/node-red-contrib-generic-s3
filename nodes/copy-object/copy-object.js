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

    // msg object clone
    let msgClone;
    try {
      msgClone = structuredClone(msg);
    } catch (e) {
      msg.error = e;
      this.error(e, e);
      return;
    }

    /**
     * Create a payloadConfig object containing parameters to be sent to S3 API
     * https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
     */
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

    // copy source parameter
    let copysource = n.copysource != "" ? n.copysource : null;
    if (!copysource) {
      copysource = msgClone.copysource ? msgClone.copysource : null;
      if (!copysource) {
        this.error("No Copy Source provided!");
        return;
      }
    }

    // versionId parameter
    let versionid = n.versionid != "" ? n.versionid : null;
    if (!versionid) {
      versionid = msgClone.versionid ? msgClone.versionid : null;
    }

    if (versionid) {
      payloadConfig.CopySource = encodeURI(
        `${copysource}?versionId=${encodeURIComponent(versionid)}`
      );
    } else {
      payloadConfig.CopySource = encodeURI(copysource);
    }

    // ContentEncoding parameter
    let contentencoding = n.contentencoding != "" ? n.contentencoding : null;
    if (!contentencoding) {
      contentencoding = msgClone.contentencoding
        ? msgClone.contentencoding
        : null;
      if (contentencoding && !isValidContentEncoding(contentencoding)) {
        this.error("Invalid content encoding!");
        return;
      }
    }
    payloadConfig.ContentEncoding = contentencoding;

    // ACL parameter
    let acl = n.acl && n.acl !== "" ? n.acl : null;
    if (!acl) {
      acl = msgClone.acl ? msgClone.acl : null;
      if (acl && !isValidACL(acl)) {
        this.error("Invalid ACL permissions value");
        return;
      }
    }
    payloadConfig.ACL = acl;

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
      msgClone.payload = result;
      // Append the bucket to
      // the message object
      msgClone.bucket = payloadConfig.Bucket;
      send(msgClone);
      this.status({ fill: "green", shape: "dot", text: "Success" });
    } catch (err) {
      // If error occurs
      msgClone.error = err;
      msgClone.payload = null;
      msgClone.bucket = payloadConfig.Bucket;
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
