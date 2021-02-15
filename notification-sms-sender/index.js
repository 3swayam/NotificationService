var AWS = require('aws-sdk');
const layer = require('notification-layer');
let CONSTANT = require("./config.json");
console.log("Initialize notification-sms-sender");
exports.handler = async (event) => {

    console.log("SQS Message Count ", event.Records.length);
    for (const { messageId, body, messageAttributes, eventSourceARN } of event.Records) {

        const notificationId = messageAttributes.notificationId.stringValue;
        const userId = messageAttributes.userId.stringValue;
        const sqsArn = eventSourceARN;
        console.log('SQS message %s', messageId, ' for ', notificationId, ' from ', sqsArn);
        // Create SMS Attribute parameters
        var smsType = "";
        if (sqsArn == CONSTANT.TRANSACTIONAL_SNS_QUEUE_URL) {

            smsType = CONSTANT.TRANSACTIONAL_SMS_TYPE;
        } else {
            smsType = CONSTANT.PROMOTIONAL_SMS_TYPE;
        }
        console.log("sms Type ", smsType);
        try {
            var params = {
                attributes: { /* required */
                    'DefaultSMSType': smsType
                }
            };

            var payload = {
                PhoneNumber: messageAttributes.mobileno.stringValue,
                Message: body
            };
            var sns = await new AWS.SNS({ apiVersion: '2010-03-31' })
            var attrresponse = await sns.setSMSAttributes(params);
            console.log("Attribute  Respose");
            console.log(attrresponse);

            var response = await sns.publish(payload).promise();
            var result = await layer.$lib.dynamoUtils.updateSuccess(notificationId, userId, response);
            console.log("Response  Notification ID", notificationId, " has been updated ", response);
        } catch (err) {
            var result = await layer.$lib.dynamoUtils.updateError(notificationId, userId, err);
            console.log(err);
        }
    }

    console.log("returning...");
    return;
}