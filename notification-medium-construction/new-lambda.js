var AWS = require('aws-sdk');
const layer = require('notification-layer');
AWS.config.update({ region: 'ap-south-1' });
let CONSTANT = require("./config.json");
const projectId = process.env.projectId;
// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var pinpoint = new AWS.Pinpoint({ region: process.env.region });

//SNS-->LAMBDA-->SQS
exports.handler = async (event, context) => {
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
    console.log("Medium is constructed for : " + message.notificationId + " for medium :" + message.medium);
    if (params.MessageBody !== undefined && message.medium !== CONSTANT.MEDIUM_SMS_TRANSACTIONAL.NAME) {
        console.log("Sending sqs for APP : " + params.MessageAttributes.notificationId.StringValue);
        try {
            console.log("Send to SQS for  ", message.notificationId);
            var response = await sqs.sendMessage(params).promise();
            console.log("RESPONSE FOR APP NOTIFICATION  ", response);
            layer.$lib.dynamoUtils.updateMediumSuccess(params.MessageAttributes.notificationId.StringValue, params.MessageAttributes.userId.StringValue, response);

        } catch (error) {
            console.log("***********ERORR*****", error);
            layer.$lib.dynamoUtils.updateError(params.MessageAttributes.notificationId.StringValue, params.MessageAttributes.userId.StringValue, error);

        }
        // return sqs.sendMessage(params, function (err, data) {

        //     console.log("Send to SQS for  ", message.notificationId);

        //     if (err) {
        //         console.log("***********ERORR*****", err);
        //         layer.$lib.dynamoUtils.updateError(params.MessageAttributes.notificationId.StringValue, params.MessageAttributes.userId.StringValue, err);
        //         console.log("Error while sending Message in Queue " + message.notificationId + " : " + data.MessageId);
        //         err.errorSourceFile = 'notification-medium-construction';
        //         err.date = Date.now();
        //         return { statusCode: 500, body: 'sns-error' };
        //     } else {
        //         console.log("Successfully Message Sent to SQS Successfully for APP ");
        //         console.log("Successfully Message Sent to SQS Successfully, Message ID is ", message.notificationId + " : ", data.MessageId);
        //         data.date = Date.now();
        //         layer.$lib.dynamoUtils.updateMediumSuccess(params.MessageAttributes.notificationId.StringValue, params.MessageAttributes.userId.StringValue, data);
        //         console.log("Successfully Message Sent to SQS Successfully for APP2 ");
        //         // return ({ statusCode: 204, body: data.MessageId });
        //     }
        // });
    }
    else if (params.MessageBody !== undefined && message.medium === CONSTANT.MEDIUM_SMS_TRANSACTIONAL.NAME) {
        console.log("Send SMS from constructed to sns direct for : ", message.notificationId);

        try {
            var param = {
                ApplicationId: projectId,
                MessageRequest: {
                    Addresses: {
                        [message.userData.mobileNo]: {
                            ChannelType: 'SMS'
                        }
                    },
                    MessageConfiguration: {
                        SMSMessage: {
                            Body: message.messageContent,
                            MessageType: 'TRANSACTIONAL'
                        }
                    }
                }
            };

            var response = await pinpoint.sendMessages(param).promise();
            response.MessageId = response.MessageResponse.Result[message.userData.mobileNo].MessageId;

            var Result = {};

            Result.DeliveryStatus = response.MessageResponse.Result[message.userData.mobileNo].DeliveryStatus;
            Result.StatusCode = response.MessageResponse.Result[message.userData.mobileNo].StatusCode;
            Result.StatusMessage = response.MessageResponse.Result[message.userData.mobileNo].StatusMessage;
            Result.Destination = message.userData.mobileNo;

            response.MessageResponse.Result = Result;

            console.log("Updating status in dynamo from constructed  : ", JSON.stringify(response), " ", message.notificationId, message.userId);
            var dbresponse = await layer.$lib.dynamoUtils.updateSuccess(message.notificationId, message.userId, response);
            console.log("Successfully updated in database", dbresponse);

        } catch (err) {
            console.log("Error received for pinpoint in medium constructed  : ", message.notificationId, " ", message.notificationId, message.userId);
            await layer.$lib.dynamoUtils.updateError(message.notificationId, message.userId, err);
            console.log(err);
        }

    }
    else {
        console.log("Skip message sending to SQS as No message content is defined for ", message.notificationId);
        return "fail";
    }
};
