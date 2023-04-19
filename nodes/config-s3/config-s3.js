module.exports = function(RED) {
    "use strict";

    // Configuration / Client node
    function ClientNode(n) {
        RED.nodes.createNode(this,n);
        this.endpoint = n.endpoint.trim();
        this.region = n.region.trim();
        this.forcePathStyle = n.forcePathStyle;
    }

    RED.nodes.registerType("client-s3",ClientNode, {
        credentials: {
            accesskeyid: { type:"text" },
            secretaccesskey: { type: "password" }
        },
        defaults: {
            endpoint: { type:"text" },
            region: { type:"text" },
            forcePathStyle: {type:"checkbox"}
        }
    });
}