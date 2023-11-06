module.exports = function S3MoveObject(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Move Object", nodeInstance);
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
    // Destination object key parameter
    this.key = n.key !== "" ? n.key : null;
    // Source object key
    this.sourcekey = n.sourcekey !== "" ? n.sourcekey : null;
    // Source bucket
    this.sourcebucket = n.sourcebucket !== "" ? n.sourcebucket : null;
    // ContentEncoding parameter
    this.contentencoding = n.contentencoding != "" ? n.contentencoding : null;
    // ACL parameter
    this.acl = n.acl != "" ? n.acl : null;
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

    // Checking for correct properties input
    let bucket = n.bucket != "" ? n.bucket : null;
    if (!bucket) {
      bucket = msgClone.bucket ? msgClone.bucket : null;
      if (!bucket) {
        this.error("No bucket provided!");
        return;
      }
    }

    let key = n.key !== "" ? n.key : null;
    if (!key) {
      key = msgClone.key ? msgClone.key : null;
      if (!key) {
        this.error("No object key provided!");
        return;
      }
    }

    let sourcebucket = n.sourcebucket !== "" ? n.sourcebucket : null;
    if (!sourcebucket) {
      sourcebucket = msgClone.sourcebucket ? msgClone.sourcebucket : null;
      if (!sourcebucket) {
        this.error("No sourcebucket provided!");
        return;
      }
    }

    let sourcekey = n.sourcekey !== "" ? n.sourcekey : null;
    if (!sourcekey) {
      sourcekey = msgClone.sourcekey ? msgClone.sourcekey : null;
      if (!sourcekey) {
        this.error("No sourcekey provided!");
        return;
      }
    }

    let contentencoding = n.contentencoding != "" ? n.contentencoding : null;
    if (!contentencoding) {
      contentencoding = msgClone.contentencoding
        ? msgClone.contentencoding
        : null;
    }
    if (contentencoding && !isValidContentEncoding(contentencoding)) {
      this.error("Invalid content encoding!");
      return;
    }

    // ACL parameter
    let acl = n.acl ? n.acl : null;
    if (!acl) {
      acl = msgClone.acl ? msgClone.acl : null;
    }
    if (acl && !isValidACL(acl)) {
      this.error("Invalid ACL permissions value");
      return;
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

      // Uploading
      this.status({
        fill: "blue",
        shape: "dot",
        text: "Moving...",
      });

      // Object move is actually two step process
      // 1. The object is copied from the specified source bucket to destination bucket with the specified key
      // 2. Then the source object is removed from the source bucket
      await s3Client.copyObject({
        CopySource: encodeURI(sourcebucket + "/" + sourcekey),
        Bucket: bucket,
        Key: key,
        ContentEncoding: contentencoding,
        ACL: acl,
      });
      const result = await s3Client.deleteObject({
        Bucket: sourcebucket,
        Key: sourcekey,
      });
      msgClone.payload = result;
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
