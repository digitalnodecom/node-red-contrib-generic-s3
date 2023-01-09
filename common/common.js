// Check if value is JSON string
const isJsonString = (str) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

// Check if value is object
const isObject = (obj) => {
    return Object.prototype.toString.call(obj) === '[object Object]'
}

// Check if value string
const isString = (value) => {
    return typeof value === 'string' || value instanceof String;
}

// Convert stream to string
const streamToString = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

// Convert string to stream
const stringToStream = (string) => {
    var stream = new Readable();
    if(!isString(string)) return null;
    // Catch this in later nodes
    try {
        stream.push(string);
        stream.push(null);
        return stream;
    } catch (err) {
        return `Error: ${err}`;
    }
}

// Check if a given array has valid input objects
const isValidInputObjectArray = (arr) => {
    let isValid = true;
    arr.forEach(element => {
        if (
            !element.hasOwnProperty('bucket') ||
            !element.hasOwnProperty('key') ||
            !element.hasOwnProperty('body') ||
            !element.hasOwnProperty('contentType') ||
            !isString(element['body'])
        ) isValid = false;

        if(element.hasOwnProperty('metadata'))
            if(!isJsonString(element.metadata))
                if(!isObject(element.metadata))
                    isValid = false;
    });
    return isValid;
}

// Create S3 client format object array from input object array
const createS3formatInputObjectArray = (arr) => {
    let s3Array = [];
    arr.forEach(element => {
        if(element.hasOwnProperty('metadata'))
            s3Array.push({
                Bucket: element.bucket,
                Key: element.key,
                ContentType: element.contentType,
                Body: stringToStream(element.body),
                Metadata: element.metadata
            })
        else
            s3Array.push({
                Bucket: element.bucket,
                Key: element.key,
                ContentType: element.contentType,
                Body: stringToStream(element.body)
            })
    })

    return s3Array;
}

module.exports = { isJsonString, isObject, isString, streamToString, stringToStream, isValidInputObjectArray, createS3formatInputObjectArray }