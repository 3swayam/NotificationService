const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
AWS.config.update({ region: 'ap-south-1' });
var ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

exports.handler = async (event) => {
    // TODO implement
    // event.medium and event.date
    if (!event.medium) {     // call for all mediums 
    } else {                 // call for single med
    }
    var today = Date.now().toString();
    var firstDate = today.substring(0, 5) + '00200000';
    var lastDate = today.substring(0, 5) + '86599001';

    return { f: firstDate, l: lastDate, now: today }
    //let result = await util.get();

};

let util = {
    get: async (requestid) => {

        var params = {
            TableName: 'notification_service',
            IndexName: "medium-timestamp-index",
            // KeyConditionExpression: '#medium = :hkey ',
            KeyConditionExpression: '#medium = :hkey AND #ts BETWEEN :tkey AND :tkey1',
            ExpressionAttributeValues: {
                ':hkey': "APP",
                ':tkey': "1602400200000",
                ':tkey1': "1602486599000"
            },
            ExpressionAttributeNames: {
                "#medium": "medium"
                , "#ts": "timestamp"
            },
        };

        return documentClient.query(params).promise();
    }
}
