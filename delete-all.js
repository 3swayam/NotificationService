const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB({ region: 'ap-south-1', apiVersion: '2012-08-10' });
const tableName = "notification_service";
exports.handler = async (event) => {
    let items = await util.getAllItemsFromTable(tableName);
    var c = 0;
    for (obj of items) {
        let a = await util.deleteItem(obj.notificationId["S"], obj.userId["S"]);
    }
    return c;
}
let util = {
    getAllItemsFromTable: async TableName => {
        const Res = await dynamoDB.scan({ TableName }).promise();
        return Res.Items;
    },
    deleteItem: async (id, uid) => {
        console.log("********in delete fucntion delete of --->", id)
        var params = {
            Key: {
                "notificationId": {
                    "S": id
                },
                "userId": {
                    "S": uid
                }
            },
            TableName: "notification_service"
        };
        return dynamoDB.deleteItem(params).promise();
    }
}
