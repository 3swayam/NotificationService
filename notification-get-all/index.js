const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
AWS.config.update({ region: 'ap-south-1' });
const layer = require('notification-layer');
let CONSTANT = require("./constant.json");

exports.handler = async (event) => {
    var counting = {
        "APP": 0, "SMS": 0 //, "WHATSAPP": 0,"EMAIL": 0
    };
    var noti = [];
    if (event.date || (event.fromTime && event.toTime)) {
        if (event.fromTime && event.toTime) {
            var fromDate = new Date(event.fromTime);
            fromDate = fromDate.getTime().toString();
            var toDate = new Date(event.toTime);
            toDate = toDate.getTime().toString();

        } else {
            var fromDate = new Date(event.date);
            fromDate = (parseInt(fromDate.getTime()) - 19800000).toString(); //convert to gmt+5:30
            if (event.toDate) {
                var toDate = new Date(event.toDate);
                toDate = (parseInt(toDate.getTime()) - 19800000 + 86399001).toString();
            }
            else {
                var toDate = (parseInt(fromDate) + 86399001).toString();
            }
        }

        if (!event.medium) {     // call for all mediums 
            console.log("LINE 34-->", fromDate, toDate)
            for (let med in counting) {
                console.log(med, fromDate, toDate);
                let arr = await util.get(med, fromDate, toDate);
                counting[med] = arr.Count;
                noti = noti.concat(arr.Items);
            }
        } else { // call for single med
            console.log("********************", event.medium, fromDate, toDate);
            let arr = await util.get(event.medium, fromDate, toDate);
            counting = {}; counting[event.medium] = arr.Count;
            noti = noti.concat(arr.Items);
        }
        noti.forEach(element => {
            if (element.messageContent) {
                element.messageContent = layer.$lib.dynamoUtils.maskContent(element.messageContent);
            }
            if (element.medium === CONSTANT.MEDIUM_APP) {
                var userData = element.userData ? JSON.parse(element.userData) : null;
                if (userData.deviceKey) {
                    userData.deviceKey = layer.$lib.dynamoUtils.maskDeviceKey(userData.deviceKey);
                }
                element.userData = JSON.stringify(userData);
            }
            else if (element.medium === CONSTANT.MEDIUM_SMS) {
                var userData = element.userData ? JSON.parse(element.userData) : null;

                if (userData.mobileNo) {
                    userData.mobileNo = layer.$lib.dynamoUtils.maskMobileNo(userData.mobileNo);
                }
                element.userData = JSON.stringify(userData);
            }
        })
        return { count: counting, notifications: noti };
    } else {
        return { error: "Date field is mandatory", count: 0, notifications: [] };
    }
};

let util = {
    get: async (mediumName, fromDate, toDate) => {
        var params = {
            TableName: 'notification_service',
            IndexName: "medium-timestamp-index",
            KeyConditionExpression: '#medium = :hkey AND #ts BETWEEN :tkey AND :tkey1',
            ExpressionAttributeValues: {
                ':hkey': mediumName,
                ':tkey': fromDate,
                ':tkey1': toDate
            },
            ExpressionAttributeNames: {
                "#medium": "medium", "#ts": "timestamp"
            },
        };
        return documentClient.query(params).promise();
    }
}
