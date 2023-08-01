module.exports = function S3PutObject(RED) {
  const nodeInstance = instanceNode(RED);
  RED.nodes.registerType("Put Object", nodeInstance);
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
    this.bucket = n.bucket !== "" ? n.bucket : null;
    // Object key parameter
    this.key = n.key !== "" ? n.key : null;
    // Body of the object to upload
    this.body = n.body !== "" ? n.body : null;
    // Upsert flag
    this.stream = n.stream ? n.stream : false;
    // Metadata of the object
    this.metadata = n.metadata !== "" ? n.metadata : null;
    // Content-Type of the object
    this.contentType = n.contentType !== "" ? n.contentType : null;
    // Upsert flag
    this.upsert = n.upsert ? n.upsert : false;
    // ACL permissions
    this.acl = n.acl && n.acl !== "" ? n.acl : false;
    // Content Encoding parameter
    this.contentencoding = n.contentencoding != "" ? n.contentencoding : null;
    // Input Handler
    this.on("input", inputHandler(this, RED));
  };
}

function inputHandler(n, RED) {
  return async function nodeInputHandler(msg, send, done) {
    // Imports
    const { S3 } = require("@aws-sdk/client-s3");
    const {
      isString,
      isJsonString,
      isObject,
      stringToStream,
      isValidContentEncoding,
      isValidACL,
    } = require("../../common/common");
    const crypto = require("crypto");

    // Checking for correct properties input
    if (!n.bucket) {
      n.bucket = msg.bucket ? msg.bucket : null;
      if (!n.bucket) {
        this.error("No bucket provided!");
        return;
      }
    }

    if (!n.key) {
      n.key = msg.key ? msg.key : null;
      if (!n.key) {
        this.error("No object key provided!");
        return;
      }
    }

    if (!n.body) {
      n.body = msg.body ? msg.body : null;
      if (!n.body) {
        this.error("No body data provided to put in the object!");
        return;
      }
    }

    if (!n.stream) {
      n.stream = msg.stream ? msg.stream : null;
    }

    // If the body is not a string
    // but neither a stream is expected, the body
    //  should be formatted as string
    if (!isString(n.body) && !n.stream) {
      this.error("The body should be formatted as string!");
      return;
    }

    if (!n.contentType) {
      n.contentType = msg.contentType ? msg.contentType : null;
      if (!n.contentType) {
        this.error("No Content-Type provided!");
        return;
      }
    }

    if (!n.metadata) {
      n.metadata = msg.metadata ? msg.metadata : null;
    }

    if (n.metadata) {
      if (!isJsonString(n.metadata)) {
        if (!isObject(n.metadata)) {
          this.error("The metadata should be of type Object!");
          return;
        }
      }

      if (!isObject(n.metadata)) {
        n.metadata = JSON.parse(n.metadata);
      }
    }

    if (!n.upsert) {
      n.upsert = msg.upsert ? msg.upsert : false;
    }

    // ContentEncoding parameter
    if (!n.contentencoding) {
      n.contentencoding = msg.contentencoding ? msg.contentencoding : null;
    }
    if (n.contentencoding && !isValidContentEncoding(n.contentencoding)) {
      this.error("Invalid content encoding!");
      return;
    }

    // ACL parameter
    if (!n.acl) {
      n.acl = msg.acl ? msg.acl : null;
    }
    if (n.acl && !isValidACL(n.acl)) {
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

      this.status({ fill: "blue", shape: "dot", text: "Uploading" });

      let bodyToUpload = n.body;

      // Body is stream check,
      // if it isn't then streamify the body
      if (!n.stream) {
        // Converting body from string to stream
        // since the sdk requires stream for upload
        bodyToUpload = stringToStream(n.body);
        if (!bodyToUpload) {
          throw new Error(
            "Failed to streamify body. Body needs to be a string!"
          );
        }
      }

      if (n.upsert) {
        const MD5 = crypto.createHash("md5").update(n.body).digest("hex");
        let headInformation = null;
        try {
          headInformation = await s3Client.headObject({
            Bucket: n.bucket,
            Key: n.key,
          });
        } catch (err) {}

        // Object does not exist
        if (!headInformation) {
          const objectToCreate = {
            Bucket: n.bucket,
            Key: n.key,
            ContentType: n.contentType,
            Body: n.bodyToUpload,
            ContentEncoding: n.contentencoding,
            ACL: n.acl,
          };

          if (n.metadata) objectToCreate.Metadata = n.metadata;

          // Uploading
          this.status({
            fill: "blue",
            shape: "dot",
            text: "Uploading",
          });

          const result = await s3Client.putObject(objectToCreate);
          // Replace the payload with
          // the returned data
          msg.payload = result;
          // Append the object
          // key to the message object
          msg.key = n.key;

          // Return the complete message object
          send(msg);
          this.status({ fill: "green", shape: "dot", text: "Success" });
        } else {
          let ETag = headInformation.ETag.substring(
            1,
            headInformation.ETag.length - 1
          ); // Formatting the ETag
          if (ETag == MD5) {
            this.warn(
              `The object ${key} has not been upserted since the body of the existing object is exactly the same`
            );
            // Replace the payload with null
            msg.payload = null;
            // Append the object
            // key to the message object
            msg.key = n.key;

            // Return the complete message object
            send(msg);
            this.status({ fill: "green", shape: "dot", text: "Success" });
          } else {
            const objectToCreate = {
              Bucket: n.bucket,
              Key: n.key,
              ContentType: n.contentType,
              Body: n.bodyToUpload,
              ContentEncoding: n.contentencoding,
              ACL: n.acl,
            };

            if (n.metadata) objectToCreate.Metadata = n.metadata;

            // Uploading
            this.status({
              fill: "blue",
              shape: "dot",
              text: "Uploading",
            });

            const result = await s3Client.putObject(objectToCreate);
            // Replace the payload with
            // the returned data
            msg.payload = result;
            // Append the object
            // key to the message object
            msg.key = n.key;

            // Return the complete message object
            send(msg);
            this.status({ fill: "green", shape: "dot", text: "Success" });
          }
        }
      } else {
        const objectToCreate = {
          Bucket: n.bucket,
          Key: n.key,
          ContentType: n.contentType,
          Body: n.bodyToUpload,
          ContentEncoding: n.contentencoding,
          ACL: n.acl,
        };

        if (n.metadata) objectToCreate.Metadata = n.metadata;

        // Uploading
        this.status({
          fill: "blue",
          shape: "dot",
          text: "Uploading",
        });

        const result = await s3Client.putObject(objectToCreate);
        // Replace the payload with
        // the returned data
        msg.payload = result;
        // Append the object
        // key to the message object
        msg.key = n.key;

        // Return the complete message object
        send(msg);
        this.status({ fill: "green", shape: "dot", text: "Success" });
      }
    } catch (err) {
      // If error occurs
      this.error(err);
      this.status({ fill: "red", shape: "dot", text: "Failure" });
      // Replace the payload with null
      msg.payload = null;
      msg.error = err;
      // Append the bucket
      // to the message object
      msg.key = n.key;
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
