module.exports = function (RED) {
  "use strict";
  const { S3 } = require("@aws-sdk/client-s3");
  const { isValidContentEncoding, isValidACL } = require("../../common/common");

  // List items from single bucket
  function S3CopyObject(n) {
    RED.nodes.createNode(this, n); // Getting options for the current node
    this.conf = RED.nodes.getNode(n.conf); // Getting configuration
    var node = this; // Referencing the current node
    var config = this.conf ? this.conf : null; // Cheking if the conf is valid

    if (!config) {
      node.warn(RED._("Missing S3 Client Configuration!"));
      return;
    }

    this.on("input", async function (msg, send, done) {
      /**
       * Create a payloadConfig object containing parameters to be sent to S3 API
       * https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
       */
      let payloadConfig = {};
      const msgClone = structuredClone(msg);

      // Bucket parameter
      let bucket = n.bucket != "" ? n.bucket : null;
      if (!bucket) {
        bucket = msgClone.bucket ? msgClone.bucket : null;
        if (!bucket) {
          node.error("No bucket provided!");
          return;
        }
      }
      payloadConfig.Bucket = bucket;

      // key parameter
      let key = n.key != "" ? n.key : null;
      if (!key) {
        key = msgClone.key ? msgClone.key : null;
        if (!key) {
          node.error("No object key provided!");
          return;
        }
      }
      payloadConfig.Key = key;

      // copy source parameter
      let copysource = n.copysource != "" ? n.copysource : null;
      if (!copysource) {
        copysource = msgClone.copysource ? msgClone.copysource : null;
        if (!copysource) {
          node.error("No Copy Source provided!");
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
        contentencoding = msgClone.contentencoding ? msgClone.contentencoding : null;
      }
      if (contentencoding && !isValidContentEncoding(contentencoding)) {
        node.error("Invalid content encoding!");
        return;
      }
      payloadConfig.ContentEncoding = contentencoding;

      let acl = n.acl && n.acl !== "" ? n.acl : false; // ACL permissions

      // ACL parameter
      if (!acl) {
        acl = msgClone.acl ? msgClone.acl : null;
      }
      if (acl && !isValidACL(acl)) {
        node.error("Invalid ACL permissions value");
        return;
      }

      payloadConfig.ACL = acl;

      // S3 client init
      let s3Client = null;
      try {
        // Creating S3 client
        s3Client = new S3({
          endpoint: config.endpoint,
          forcePathStyle: config.forcepathstyle,
          region: config.region,
          credentials: {
            accessKeyId: config.credentials.accesskeyid,
            secretAccessKey: config.credentials.secretaccesskey,
          },
        });

        node.status({ fill: "blue", shape: "dot", text: "Copying" });
        // List all objects from the desired bucket
        s3Client.copyObject(payloadConfig, function (err, data) {
          if (err) {
            node.status({ fill: "red", shape: "dot", text: `Failure` });
            node.error(err, msgClone);
            // Replace the payload with null
            msgClone.payload = null;
            // Append the bucket to
            // the message object
            msgClone.bucket = bucket;

            // Return the complete message object
            send(msgClone);

            setTimeout(() => {
              node.status({});
            }, 3000);
          } else {
            // Replace the payload with
            // the returned data
            msgClone.payload = data;
            // Append the bucket to
            // the message object
            msgClone.bucket = bucket;

            // Return the complete message object
            send(msgClone);

            // Finalize
            if (done) {
              s3Client.destroy();
              done();
            }

            node.status({ fill: "green", shape: "dot", text: "Success" });
            setTimeout(() => {
              node.status({});
            }, 2000);
          }
        });
      } catch (err) {
        // If error occurs
        node.error(err, msgClone);
        // Cleanup
        if (s3Client !== null) s3Client.destroy();
        if (done) done();

        node.status({ fill: "red", shape: "dot", text: "Failure" });
        setTimeout(() => {
          node.status({});
        }, 3000);
      }
    });
  }

  RED.nodes.registerType("Copy Object", S3CopyObject);
};
