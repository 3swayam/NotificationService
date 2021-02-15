var AWS = require('aws-sdk');
AWS.config.region = 'ap-south-1';
let CONSTANT = require("./config.json");
const layer = require('notification-layer');

exports.handler = function (event, context) {
    try {
        console.log("Length of Records ", event.Records.length);
        event.Records.forEach(record => {
            let element = record.dynamodb.NewImage;
            console.log("Event Source ARN: ", record.eventSourceARN);
            if (record.eventName == CONSTANT.INSERT_EVENT && record.eventSourceARN.includes("notification_service")) {
                if (element && element.notificationStatus.S === "1" && (element.medium.S === CONSTANT.MEDIUM_APP.NAME ||
                    element.medium.S === CONSTANT.MEDIUM_SMS.NAME) && (!element.mediumConstructedAt)) {

                    var snsObject = layer.$lib.dynamoUtils.getSNSObject(element);
                    console.log("Triggered template Identification for : ", element.notificationId.S);
                    var sns = new AWS.SNS({ apiVersion: '2010-03-31' });
                    sns.publish({
                        Message: JSON.stringify(snsObject),
                        Subject: "From Lambda Notification Template Identifier ",
                        TopicArn: 'arn:aws:sns:ap-south-1:014137093647:notification-scheduled'
                    }, function (err, data) {
                        if (err) {
                            console.log("Error in Triggering template Identification for : ", element.notificationId.S);
                            console.log(err.stack);
                            return;
                        }
                        console.log("********* published successfully for " + element.notificationId.S);
                        context.done(null, 'NOTIFICATION IS PUBLISHED TO SNS NOTIFICATION FOR : ' + element.notificationId);
                    });
                }
                else {
                    console.log("Error : NOTIFICATION details have some issue.");
                }
            }
        });
    } catch (err) {
        console.log(err);
        context.done(null, 'Error: NOTIFICATION unable to published for next');
        return;
    }
};