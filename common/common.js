const { Readable } = require("stream");

// Check if value is JSON string
const isJsonString = (str) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

// Check if value is object
const isObject = (obj) => {
  return Object.prototype.toString.call(obj) === "[object Object]";
};

// Check if value string
const isString = (value) => {
  return typeof value === "string" || value instanceof String;
};

// Convert stream to string
const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

// Convert stream to buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });

// Convert buffer to string with optional encoding
const bufferToString = (buffer, encoding = "utf-8") =>
  buffer.toString(encoding);

// Convert stream to string (base 64 encoding)
const streamToStringbase64 = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
  });

// Convert string to stream
const stringToStream = (string) => {
  var stream = new Readable();
  if (!isString(string)) return null;
  // Catch this in later nodes
  try {
    stream.push(string);
    stream.push(null);
    return stream;
  } catch (err) {
    return `Error: ${err}`;
  }
};

// Check if a given array has valid input objects
const isValidInputObjectArray = (arr) => {
  let isValid = true;
  arr.forEach((element) => {
    if (
      !element.hasOwnProperty("bucket") ||
      !element.hasOwnProperty("key") ||
      !element.hasOwnProperty("body") ||
      !element.hasOwnProperty("contentType") ||
      !isString(element["body"])
    )
      isValid = false;

    if (element.hasOwnProperty("metadata"))
      if (!isJsonString(element.metadata))
        if (!isObject(element.metadata)) isValid = false;
  });
  return isValid;
};

// Create S3 client format object array from input object array
const createS3formatInputObjectArray = (arr) => {
  let s3Array = [];
  arr.forEach((element) => {
    if (element.hasOwnProperty("metadata"))
      s3Array.push({
        Bucket: element.bucket,
        Key: element.key,
        ContentType: element.contentType,
        Body: stringToStream(element.body),
        Metadata: element.metadata,
        ContentEncoding: element.contentencoding,
      });
    else
      s3Array.push({
        Bucket: element.bucket,
        Key: element.key,
        ContentType: element.contentType,
        Body: stringToStream(element.body),
        ContentEncoding: element.contentencoding,
      });
  });

  return s3Array;
};

const isValidContentEncoding = (contentEncoding) => {
  // Define the valid contentEncoding values
  const validEncodings = ["gzip", "deflate", "br", "compress", "identity"];

  // Check if the input contentEncoding is in the list of valid encodings
  return validEncodings.includes(contentEncoding);
};

const isValidACL = (acl) => {
  // Define the valid ACL permission values
  const validACLValues = [
    "private",
    "public-read",
    "public-read-write",
    "authenticated-read",
    "aws-exec-read",
    "bucket-owner-read",
    "bucket-owner-full-control",
  ];

  // Check if the input ACL is in the list of valid ACL permission values
  return validACLValues.includes(acl);
};

module.exports = {
  isJsonString,
  isObject,
  isString,
  streamToString,
  streamToBuffer,
  streamToStringbase64,
  bufferToString,
  stringToStream,
  isValidInputObjectArray,
  createS3formatInputObjectArray,
  isValidContentEncoding,
  isValidACL,
};
