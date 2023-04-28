module.exports = function (RED) {
  "use strict";
  const { S3 } = require("@aws-sdk/client-s3");
  const {
    isJsonString,
    isValidInputObjectArray,
    createS3formatInputObjectArray,
  } = require("../../common/common");
  const crypto = require("crypto");

  // Put Objects
  function S3PutObjects(n) {
    RED.nodes.createNode(this, n); // Getting options for the current node
    this.conf = RED.nodes.getNode(n.conf); // Getting configuration
    var node = this; // Referencing the current node
    var config = this.conf ? this.conf : null; // Cheking if the conf is valid

    // If there is no conifg
    if (!config) {
      node.warn(RED._("Missing S3 Client Configuration!"));
      return;
    }

    this.on("input", async function (msg, send, done) {
      let objects = n.objects != "" ? n.objects : null; // Bucket info
      let upsert = n.upsert ? n.upsert : false; // Upsert flag

      // Checking for correct properties input
      if (!objects) {
        objects = msg.objects ? msg.objects : null;

        if (!isJsonString(objects)) {
          if (!Array.isArray(objects)) {
            node.error("Invalid objects input format!");
            return;
          }
        }

        if (isJsonString(objects)) objects = JSON.parse(objects);

        if (!Array.isArray(objects)) {
          node.error("The provided input for objects is not an array!");
          return;
        }

        if (!isValidInputObjectArray(objects)) {
          node.error("The provided array's objects are not in valid format!");
          return;
        }
      }

      if (!upsert) {
        upsert = msg.upsert ? msg.upsert : false;
      }

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

        // Creating the upload object
        let inputObjects = objects;
        // let inputObjects = createS3formatInputObjectArray(this.objects);
        let objectsToPut = [];
        if (upsert) {
          node.status({ fill: "blue", shape: "ring", text: "Comparison" });
          for (let i = 0; i < inputObjects.length; i++) {
            node.status({
              fill: "blue",
              shape: "ring",
              text: `Comparison ${parseInt((i / inputObjects.length) * 100)}%`,
            });
            try {
              let objectMeta = await s3Client.headObject({
                Bucket: inputObjects[i].bucket,
                Key: inputObjects[i].key,
              });

              let ETag = objectMeta.ETag.substring(
                1,
                objectMeta.ETag.length - 1
              ); // Formatting the ETag
              const MD5 = crypto
                .createHash("md5")
                .update(inputObjects[i].body)
                .digest("hex");

              // Checking if the existing object data is exactly the same as the request message
              if (ETag != MD5) {
                objectsToPut.push(inputObjects[i]);
              }
            } catch (e) {
              objectsToPut.push(inputObjects[i]);
            }
          }
        } else {
          objectsToPut = inputObjects;
        }

        // Formatting the array into appropriate S3 SDK input array
        objectsToPut = createS3formatInputObjectArray(objectsToPut);

        if (objectsToPut.length == 0) {
          // Replace the payload with null
          msg.payload = null;

          // Return the complete message object
          send(msg);

          node.warn(
            "All of the objects are exactly the same as the already existing ones in the specified bucket!"
          );

          node.status({
            fill: "yellow",
            shape: "dot",
            text: "No objects uploaded!",
          });

          // Cleanup
          if (done) {
            s3Client.destroy();
            done();
          }

          setTimeout(() => {
            node.status({});
          }, 5000);

          return;
        }

        // Uploading
        node.status({ fill: "blue", shape: "dot", text: "Uploading" });
        let responses = [];
        for (let i = 0; i < objectsToPut.length; i++) {
          let response = {
            payload: {},
            key: objectsToPut[i].Key,
          };
          response.payload = await s3Client.putObject(objectsToPut[i]);
          responses.push(response);
          node.status({
            fill: "blue",
            shape: "dot",
            text: `Uploading ${parseInt((i / objectsToPut.length) * 100)}%`,
          });
        }

        // Replace the payload with
        // the returned data
        msg.payload = responses;

        // Return the complete message object
        send(msg);

        // Finalize
        if (done) {
          s3Client.destroy();
          done();
        }

        node.status({ fill: "green", shape: "dot", text: `Success` });
        setTimeout(() => {
          node.status({});
        }, 5000);
      } catch (err) {
        // If error occurs
        node.error(err);
        // Cleanup
        if (s3Client !== null) s3Client.destroy();
        if (done) done();

        node.status({ fill: "red", shape: "dot", text: "Failure" });
        setTimeout(() => {
          node.status({});
        }, 5000);
      }
    });
  }

  RED.nodes.registerType("Put Objects", S3PutObjects);
};
