// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');
let CONSTANT = require("./config.json");

// Set the region 
AWS.config.update({ region: 'ap-south-1' });

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });


exports.handler = async (event) => {
    const errorobject = {
        errorcode: 500,
        errormessage: CONSTANT.ERR_SOMETHING_WENT_WRONG,
        errorSourceFile: CONSTANT.SMS_QUEUE_PUBLISHER
    }
    console.log("returning value");
    return CONSTANT.SUCCESS_MESSAGE;
};