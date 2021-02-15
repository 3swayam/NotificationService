var AWS = require('aws-sdk');
var pinpoint = new AWS.Pinpoint({ region: process.env.region });
const layer = require('notification-layer');
// Make sure the SMS channel is enabled for the projectId that you specify.
// See: https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-sms-setup.html
const projectId = process.env.projectId;

// You need a dedicated long code in order to use two-way SMS. 
// See: https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-voice-manage.html#channels-voice-manage-request-phone-numbers


exports.handler = async (event) => {

    console.log("SQS Message Count ", event.Records.length);
    for (const { messageId, body, messageAttributes, eventSourceARN } of event.Records) {

        const notificationId = messageAttributes.notificationId.stringValue;
        const userId = messageAttributes.userId.stringValue;
        const sqsArn = eventSourceARN;
        console.log('SQS message %s', messageId, ' for ', notificationId, ' from ', sqsArn);
        // Create SMS Attribute parameters
        var smsType = "";

        if (sqsArn == process.env.TRANSACTIONAL_SNS_QUEUE_URL) {

            smsType = process.env.TRANSACTIONAL_SMS_TYPE;
        } else {
            smsType = process.env.TRANSACTIONAL_SMS_TYPE;//TO BE FIXED FOR PROMOTIONAL-- THROTTLED ALL REQUESTS
        }
        console.log("sms Type ", smsType);
        try {
            console.log("Trying for sms ", messageAttributes.mobileno.stringValue);
            var params = {
                ApplicationId: projectId,
                MessageRequest: {
                    Addresses: {
                        [messageAttributes.mobileno.stringValue]: {
                            ChannelType: 'SMS'
                        }
                    },
                    MessageConfiguration: {
                        SMSMessage: {
                            Body: body,
                            MessageType: smsType
                        }
                    }
                }
            };

            var response = await pinpoint.sendMessages(params).promise();
            response.MessageId = response.MessageResponse.Result[messageAttributes.mobileno.stringValue].MessageId;

            var Result = {};

            Result.DeliveryStatus = response.MessageResponse.Result[messageAttributes.mobileno.stringValue].DeliveryStatus;
            Result.StatusCode = response.MessageResponse.Result[messageAttributes.mobileno.stringValue].StatusCode;
            Result.StatusMessage = response.MessageResponse.Result[messageAttributes.mobileno.stringValue].StatusMessage;
            Result.Destination = messageAttributes.mobileno.stringValue;
            response.MessageResponse.Result = Result;
            console.log("Response of send message");
            console.log(response);
            await layer.$lib.dynamoUtils.updateSuccess(notificationId, userId, response);

        } catch (err) {
            await layer.$lib.dynamoUtils.updateError(notificationId, userId, err);
            console.log(err);
        }
    }

    console.log("returning...");
    return;
}
