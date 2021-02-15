
const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });


module.exports = {
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
        console.log("updaterror for ",id);
        var params = {
            TableName: 'notification_service',
            Key: {
                notificationId: id,
                userId: userId
            },
            UpdateExpression: 'set mediumsuccess = :x',

            ExpressionAttributeValues: {
                ':x': mediumsuccess
            }
        };

        return documentClient.update(params).promise();
    },
    updateSuccess:  (id, userId, success) => {
 
        var params = {
            TableName: 'notification_service',
            Key: {
                notificationId: id,
                userId: userId
            },
            UpdateExpression: 'set success = :x , completionDate = :d',

            ExpressionAttributeValues: {
                ':x': success,
                ':d' : Date.now()
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
                ':d' : Date.now()
            }
        };

        return documentClient.update(params).promise();
    }
};