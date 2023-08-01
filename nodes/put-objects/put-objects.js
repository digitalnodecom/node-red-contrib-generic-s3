module.exports = function S3PutObjects(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Put Objects", nodeInstance);
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
    // Objects to insert
    this.objects = n.objects != "" ? n.objects : null;
    // Upsert flag
    this.upsert = n.upsert ? n.upsert : false;
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    // Imports
    const { S3 } = require("@aws-sdk/client-s3");
    const {
      isJsonString,
      isValidInputObjectArray,
      createS3formatInputObjectArray,
    } = require("../../common/common");
    const crypto = require("crypto");

    // Checking for correct properties input
    if (!n.objects) {
      n.objects = msg.objects ? msg.objects : null;

      if (!isJsonString(n.objects)) {
        if (!Array.isArray(n.objects)) {
          this.error("Invalid objects input format!");
          return;
        }
      }

      if (isJsonString(n.objects)) n.objects = JSON.parse(n.objects);

      if (!Array.isArray(n.objects)) {
        this.error("The provided input for objects is not an array!");
        return;
      }

      if (!isValidInputObjectArray(n.objects)) {
        this.error("The provided array's objects are not in valid format!");
        return;
      }
    }

    if (!n.objects) {
      n.objects = msg.upsert ? msg.upsert : false;
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
      // Creating the upload object
      let inputObjects = n.objects;
      // let inputObjects = createS3formatInputObjectArray(this.objects);
      let objectsToPut = [];
      if (n.upsert) {
        this.status({ fill: "blue", shape: "ring", text: "Comparison" });
        for (let i = 0; i < inputObjects.length; i++) {
          this.status({
            fill: "blue",
            shape: "ring",
            text: `Comparison ${parseInt((i / inputObjects.length) * 100)}%`,
          });
          try {
            let objectMeta = await s3Client.headObject({
              Bucket: inputObjects[i].bucket,
              Key: inputObjects[i].key,
            });

            let ETag = objectMeta.ETag.substring(1, objectMeta.ETag.length - 1); // Formatting the ETag
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

        this.warn(
          "All of the objects are exactly the same as the already existing ones in the specified bucket!"
        );

        this.status({
          fill: "yellow",
          shape: "dot",
          text: "No objects uploaded!",
        });

        return;
      }

      // Uploading
      this.status({ fill: "blue", shape: "dot", text: "Uploading" });
      let responses = [];
      for (let i = 0; i < objectsToPut.length; i++) {
        let response = {
          payload: {},
          key: objectsToPut[i].Key,
        };
        response.payload = await s3Client.putObject(objectsToPut[i]);
        responses.push(response);
        this.status({
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
      this.status({ fill: "green", shape: "dot", text: "Success" });
    } catch (err) {
      // If error occurs
      this.error(err);
      this.status({ fill: "red", shape: "dot", text: "Failure" });
      // Replace the payload with null
      msg.payload = null;
      msg.error = err;
      send(msg);
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
