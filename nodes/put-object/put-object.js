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

    // msg object clone
    const msgClone = structuredClone(msg);

    let bucket = n.bucket ? n.bucket : null;
    // Checking for correct properties input
    if (!bucket) {
      bucket = msgClone.bucket ? msgClone.bucket : null;
      if (!bucket) {
        this.error("No bucket provided!");
        return;
      }
    }

    let key = n.key ? n.key : null;
    if (!key) {
      key = msgClone.key ? msgClone.key : null;
      if (!key) {
        this.error("No object key provided!");
        return;
      }
    }

    let body = n.body ? n.body : null;
    if (!body) {
      body = msgClone.body ? msgClone.body : null;
      if (!body) {
        this.error("No body data provided to put in the object!");
        return;
      }
    }

    let stream = n.stream ? n.stream : null;
    if (!stream) {
      stream = msgClone.stream ? msgClone.stream : null;
    }

    // If the body is not a string
    // but neither a stream is expected, the body
    //  should be formatted as string
    if (!isString(body) && !stream) {
      this.error("The body should be formatted as string!");
      return;
    }

    let contentType = n.contentType ? n.contentType : null;
    if (!contentType) {
      contentType = msgClone.contentType ? msgClone.contentType : null;
      if (!contentType) {
        this.error("No Content-Type provided!");
        return;
      }
    }

    let metadata = n.metadata ? n.metadata : null;
    if (!metadata) {
      metadata = msgClone.metadata ? msgClone.metadata : null;
    }

    if (metadata) {
      if (!isJsonString(metadata)) {
        if (!isObject(metadata)) {
          this.error("The metadata should be of type Object!");
          return;
        }
      }

      if (!isObject(metadata)) {
        metadata = JSON.parse(metadata);
      }
    }

    let upsert = n.upsert ? n.upsert : false;
    if (!upsert) {
      upsert = msgClone.upsert ? msgClone.upsert : false;
    }

    // ContentEncoding parameter
    let contentencoding = n.contentencoding ? n.contentencoding : false;
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

      this.status({ fill: "blue", shape: "dot", text: "Uploading" });

      let bodyToUpload = body;

      // Body is stream check,
      // if it isn't then streamify the body
      if (!stream) {
        // Converting body from string to stream
        // since the sdk requires stream for upload
        bodyToUpload = stringToStream(body);
        if (!bodyToUpload) {
          throw new Error(
            "Failed to streamify body. Body needs to be a string!"
          );
        }
      }

      if (upsert) {
        const MD5 = crypto.createHash("md5").update(body).digest("hex");
        let headInformation = null;
        try {
          headInformation = await s3Client.headObject({
            Bucket: bucket,
            Key: key,
          });
        } catch (err) {}

        // Object does not exist
        if (!headInformation) {
          const objectToCreate = {
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
            Body: bodyToUpload,
            ContentEncoding: contentencoding,
            ACL: acl,
          };

          if (metadata) objectToCreate.Metadata = metadata;

          // Uploading
          this.status({
            fill: "blue",
            shape: "dot",
            text: "Uploading",
          });

          const result = await s3Client.putObject(objectToCreate);
          // Replace the payload with
          // the returned data
          msgClone.payload = result;
          // Append the object
          // key to the message object
          msgClone.key = key;

          // Return the complete message object
          send(msgClone);
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
            msgClone.payload = null;
            // Append the object
            // key to the message object
            msgClone.key = key;

            // Return the complete message object
            send(msgClone);
            this.status({ fill: "green", shape: "dot", text: "Success" });
          } else {
            const objectToCreate = {
              Bucket: bucket,
              Key: key,
              ContentType: contentType,
              Body: bodyToUpload,
              ContentEncoding: contentencoding,
              ACL: acl,
            };

            if (metadata) objectToCreate.Metadata = metadata;

            // Uploading
            this.status({
              fill: "blue",
              shape: "dot",
              text: "Uploading",
            });

            const result = await s3Client.putObject(objectToCreate);
            // Replace the payload with
            // the returned data
            msgClone.payload = result;
            // Append the object
            // key to the message object
            msgClone.key = key;

            // Return the complete message object
            send(msgClone);
            this.status({ fill: "green", shape: "dot", text: "Success" });
          }
        }
      } else {
        const objectToCreate = {
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
          Body: bodyToUpload,
          ContentEncoding: contentencoding,
          ACL: acl,
        };

        if (metadata) objectToCreate.Metadata = metadata;

        // Uploading
        this.status({
          fill: "blue",
          shape: "dot",
          text: "Uploading",
        });

        const result = await s3Client.putObject(objectToCreate);
        // Replace the payload with
        // the returned data
        msgClone.payload = result;
        // Append the object
        // key to the message object
        msgClone.key = key;

        // Return the complete message object
        send(msgClone);
        this.status({ fill: "green", shape: "dot", text: "Success" });
      }
    } catch (err) {
      // If error occurs
      this.status({ fill: "red", shape: "dot", text: "Failure" });
      // Replace the payload with null
      msgClone.payload = null;
      msgClone.error = err;
      // Append the bucket
      // to the message object
      msgClone.key = key;
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
