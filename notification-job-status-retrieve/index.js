const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1', apiVersion: '2012-08-10' });

exports.handler = async (event, context, callback) => {
    if (!event.jobId) {
        return { error: "JobId is missing.", list: [] };
    }
    var params = {
        TableName: 'notification_jobs_status',
        IndexName: 'jobId-index',
        KeyConditionExpression: 'jobId = :jobId',
        ExpressionAttributeValues: {
            ':jobId': event.jobId
        }
    };
    return await documentClient.query(params).promise()
        .then(res => { return res.Items; })
        .catch(err => { return { error: err }; });
};