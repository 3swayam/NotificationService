const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
AWS.config.update({ region: 'ap-south-1' });
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
var attr = require('dynamodb-data-types').AttributeValue;
var attrUpdate = require('dynamodb-data-types').AttributeValueUpdate;
exports.$lib = {
    dynamoUtils: {
        get: async (requestid) => {
            var params = {
                TableName: 'notification_service',
                KeyConditionExpression: 'notificationId = :hkey',
                ExpressionAttributeValues: {
                    ':hkey': requestid
                }
            };

            return documentClient.query(params).promise();
        },

        updateMediumSuccess: async (id, userId, mediumsuccess) => {
            var params = {
                TableName: 'notification_service',
                Key: {
                    notificationId: id,
                    userId: userId
                },
                UpdateExpression: 'set mediumsuccess = :x, mediumConstructedAt = :d',

                ExpressionAttributeValues: {
                    ':x': mediumsuccess,
                    ':d': Date.now()
                }
            };
            console.log("updateMediumSuccess... ");
            return documentClient.update(params).promise();
        },
        unwrapDynamoItem: async (dataItem) => {
            return attr.unwrap(dataItem);
        },
        wrapDynamoItem: async (dataItem) => {
            return attr.wrap(dataItem);
        },
        unwrapResponseList: async (listOfItems) => {
            listOfItems.forEach(element => {
                element = attr.unwrap(element.PutRequest.Item);
            });
            return listOfItems;
        },
        //end of medium-construction

        //start of notification-request-receive
        MAX_ARRAY_SIZE: 20000,
        TEMPLATE_NOT_FOUND: 0,
        SCHEDULING_NOT_SUPPORT: 1,
        SUPPORTING_MEDIUMS: ['APP', 'SMS', 'EMAIL'],
        MEDIUM_NOT_FOUND: "MEDIUM_NOT_FOUND",
        USERID_CATERGORY_MOBILENO_NOT_FOUND: "USERID_CATERGORY_MOBILENO_NOT_FOUND",
        USERID_CATERGORY_EMAILID_NOT_FOUND: "USERID_CATERGORY_EMAILID_NOT_FOUND",
        USERID_CATERGORY_MEDIUM_NOT_FOUND: "USERID_CATERGORY_MEDIUM_NOT_FOUND",
        MANDATORY_FIELDS_NOT_FOUND: "MANDATORY_FIELDS_NOT_FOUND",
        USERID_CATERGORY_DEVICE_KEY_NOT_FOUND: "USERID_CATERGORY_DEVICE_KEY_NOT_FOUND",
        ERROR_ARRAY_OUT_OF_LIMIT: 'ARRAY_OUT_OF_LIMIT',
        SUCCESS_NOTIFICATION_STATUS: "1",
        ERROR_NOTIFICATION_STATUS: "0",
        MISSING_VALUE: "UNDEFINED",
        getBatchObject: async (element, counter) => {
            var date = new Date();
            var timestamp = '' + date.getTime();
            var object = { PutRequest: {} };
            object.PutRequest.Item = {
                "notificationId": {
                    "S": timestamp + '_'
                        + (element.userId ? element.userId : exports.$lib.dynamoUtils.MISSING_VALUE) + '_' + counter + '_' + (element.notificationCategory ? element.notificationCategory : exports.$lib.dynamoUtils.MISSING_VALUE) + '_'
                        + (element.medium ? element.medium : exports.$lib.dynamoUtils.MISSING_VALUE)
                },//"timestamp_userId_notificationCategory_medium",
                "userId": { "S": (element.userId ? (element.userId).toString() : exports.$lib.dynamoUtils.MISSING_VALUE) },
                "medium": { "S": (element.medium ? element.medium : exports.$lib.dynamoUtils.MISSING_VALUE) },
                "title": { "S": element.title ? element.title : '' },
                "messageContent": { "S": element.messageContent ? element.messageContent : '' },
                "notificationCategory": { "S": (element.notificationCategory ? (element.notificationCategory).toString() : exports.$lib.dynamoUtils.MISSING_VALUE) },
                "scheduleType": { "S": element.scheduleType ? element.scheduleType : '' },
                "notificationStatus": { "S": (element.errorobject ? exports.$lib.dynamoUtils.ERROR_NOTIFICATION_STATUS : exports.$lib.dynamoUtils.SUCCESS_NOTIFICATION_STATUS) }, //1: Success, 0:Error
                "timestamp": { "S": timestamp },
                "userData": { "S": element.userData ? JSON.stringify(element.userData) : '' },
                "errorobject": { "S": element.errorobject ? JSON.stringify({ "error": element.errorobject }) : '' }
            };
            return object;
        },
        validateObject: async (element, counter) => {
            if (element.medium && element.userId && element.userData && element.notificationCategory && element.messageContent) {
                element.notificationCategory = element.notificationCategory.toString();
                element.userId = element.userId.toString();
                var index = exports.$lib.dynamoUtils.SUPPORTING_MEDIUMS.
                    findIndex(x => x.trim().toLowerCase() === element.medium.trim().toLowerCase());
                if (index != -1) {
                    if (element.medium == 'SMS' && !element.userData.mobileNo) {
                        element.errorobject = exports.$lib.dynamoUtils.USERID_CATERGORY_MOBILENO_NOT_FOUND;
                    } else if (element.medium == 'APP' && !element.userData.deviceKey) {
                        element.errorobject = exports.$lib.dynamoUtils.USERID_CATERGORY_DEVICE_KEY_NOT_FOUND;
                    } else if (element.medium == 'EMAIL' && !element.userData.emailId) {
                        element.errorobject = exports.$lib.dynamoUtils.USERID_CATERGORY_EMAILID_NOT_FOUND;
                    }
                } else {
                    element.errorobject = exports.$lib.dynamoUtils.MEDIUM_NOT_FOUND;
                }
            } else {
                element.errorobject = exports.$lib.dynamoUtils.MANDATORY_FIELDS_NOT_FOUND;
            }
            return await exports.$lib.dynamoUtils.getBatchObject(element, counter);
        },
        batchWrite: async (batchList) => {
            var notificationrequests = {
                "RequestItems": {
                    "notification_service":
                        batchList
                }
            }
            return ddb.batchWriteItem(notificationrequests).promise();
        },

        //end of notification-request-receive

        //start of notification-scheduling
        getSNSObject: (object) => {
            var newObj = {};
            for (const key in object) {
                if (object[key]['S']) {
                    var checkIfJsonString = tryParseJSON(object[key]['S']);
                    function tryParseJSON(jsonString) {
                        try {
                            var o = JSON.parse(jsonString); if (o && typeof o === "object") {
                                return o;
                            }
                        }
                        catch (e) { }
                        return false;
                    };
                    newObj[key] = checkIfJsonString ? checkIfJsonString : object[key]['S'];
                }
                if (object[key]['N']) {
                    newObj[key] = object[key]['N'];
                }
            }

            return newObj;
        },
        //end of notification-scheduling

        //start of notification-X(sms/app)-subscriber

        updateSuccess: (id, userId, success) => {

            var params = {
                TableName: 'notification_service',
                Key: {
                    notificationId: id,
                    userId: userId
                },
                UpdateExpression: 'set success = :x , completionDate = :d',

                ExpressionAttributeValues: {
                    ':x': success,
                    ':d': Date.now()
                }
            };

            return documentClient.update(params).promise();
        },
        updateError: async (primaryKey, userId, errorobject) => {
            var params = {
                TableName: 'notification_service',
                Key: {
                    notificationId: primaryKey,
                    userId: userId
                },
                UpdateExpression: 'set notificationStatus = :x , errorobject = :e, completionDate = :d',

                ExpressionAttributeValues: {
                    ':x': '0',
                    ':e': errorobject,
                    ':d': Date.now()
                }
            };

            return documentClient.update(params).promise();
        },
        maskDeviceKey: function (str) {
            var first4 = str.substring(0, 15);
            return first4.concat("*******");
        },
        maskContent: function (str) {
            var strFirst = str.trim().split(' ');
            var strTwo = (strFirst[0]).concat("************************");
            return strTwo.concat(strFirst[strFirst.length - 1]);
        },
        maskMobileNo: function (str) {
            var lastFourDigit = "******" + str.substring(str.length - 4);
            return lastFourDigit;
        }
    }
}