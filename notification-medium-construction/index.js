var AWS = require('aws-sdk');
const layer = require('notification-layer');
AWS.config.update({ region: 'ap-south-1' });
let CONSTANT = require("./config.json");

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });


//SNS-->LAMBDA-->SQS
exports.handler = (event, context) => {
    console.log("Length of Notification Medium Construction .. ==> ", event.Records.length);
    const message = JSON.parse(event.Records[0].Sns.Message);

    var params = {};
    //ToDo : Create a Factory Pattern
    if (message.medium === CONSTANT.MEDIUM_SMS_TRANSACTIONAL.NAME) {
        params = {

            MessageAttributes: {
                "timestamp": {
                    DataType: "String",
                    StringValue: Date.now().toString()
                },
                "mobileno": {
                    DataType: "String",
                    StringValue: message.userData.mobileNo
                },
                "notificationId": {
                    DataType: "String",
                    StringValue: message.notificationId

                },
                "userId": {
                    DataType: "String",
                    StringValue: message.userId

                }
                //todo: send notification Id 

            },
            MessageBody: message.messageContent,
            MessageDeduplicationId: message.notificationId + Date.now().toString(),  // Required for FIFO queues
            MessageGroupId: message.notificationCategory,  // Required for FIFO queues
            //Todo: make it configurable
            QueueUrl: (message.scheduleType == CONSTANT.SCHEDULE_TYPE_PROMOTIONAL ?
                CONSTANT.MEDIUM_SMS_PROMOTIONAL.QUEUE_URL : CONSTANT.MEDIUM_SMS_TRANSACTIONAL.QUEUE_URL)
        };
    } else if (message.medium === CONSTANT.MEDIUM_APP.NAME) {

        params = {

            MessageAttributes: {
                "timestamp": {
                    DataType: "String",
                    StringValue: Date.now().toString()
                },
                "deviceKey": {
                    DataType: "String",
                    StringValue: message.userData.deviceKey
                },
                "notificationId": {
                    DataType: "String",
                    StringValue: message.notificationId

                },
                "userId": {
                    DataType: "String",
                    StringValue: message.userId

                },
                "title": {
                    DataType: "String",
                    StringValue: message.title
                },
                "notificationCategory": {
                    DataType: "String",
                    StringValue: message.notificationCategory
                }

            },
            MessageBody: message.messageContent,
            MessageDeduplicationId: message.notificationId + Date.now().toString(),  // Required for FIFO queues
            MessageGroupId: message.notificationCategory,  // Required for FIFO queues
            //Todo: make it configurable
            QueueUrl: CONSTANT.MEDIUM_APP.QUEUE_URL
        };

    } else {
        console.log("Medium is not found");
    }
    console.log("Medium is constructed for : ", message.notificationId);
    if (params.MessageBody !== undefined) {

        return sqs.sendMessage(params, function (err, data) {

            console.log("Send to SQS for  ", message.notificationId);

            if (err) {
                console.log("***********ERORR*****", err);
                layer.$lib.dynamoUtils.updateError(params.MessageAttributes.notificationId.StringValue, params.MessageAttributes.userId.StringValue, err);
                console.log("Error while sending Message in Queue " + message.notificationId + " : " + data.MessageId);
                err.errorSourceFile = 'notification-medium-construction';
                err.date = Date.now();
                return { statusCode: 500, body: 'sns-error' };
            } else {
                console.log("Successfully Message Sent to SQS Successfully, Message ID is ", message.notificationId + " : ", data.MessageId);
                data.date = Date.now();
                layer.$lib.dynamoUtils.updateMediumSuccess(params.MessageAttributes.notificationId.StringValue, params.MessageAttributes.userId.StringValue, data);
                // return ({ statusCode: 204, body: data.MessageId });
            }
        });
    } else {
        console.log("Skip message sending to SQS as No message content is defined for ", message.notificationId);
        return "fail"
    }
};
