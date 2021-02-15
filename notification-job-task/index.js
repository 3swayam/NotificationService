const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const documentWrite = new AWS.DynamoDB({ apiVersion: '2012-08-10' });
const layer = require('notification-layer');
const dynamoDB = new AWS.DynamoDB({ region: 'ap-south-1', apiVersion: '2012-08-10' });

exports.handler = async (event) => {
    // TODO implement
    var responseBody = "This call is associated with no task.";
    const requestBody = JSON.parse(event.body);
    if (event.httpMethod == 'POST') {
        var date = new Date();
        var param = {
            cron: requestBody.cron,
            description: requestBody.description,
            env: requestBody.env,
            jobContext: requestBody.jobContext,
            jobName: requestBody.jobName,
            jobType: requestBody.jobType,
            Timezone: requestBody.timezone,
            userType: requestBody.userType,
            jobId: requestBody.jobId ? requestBody.jobId : "J" + date.getTime(),
            jobStatus: requestBody.jobStatus ? requestBody.jobStatus : 0,
        };

        var newJobObj = {
            TableName: 'notification_jobs',
            Item: {}
        };
        newJobObj.Item = await layer.$lib.dynamoUtils.wrapDynamoItem(param);

        await documentWrite.putItem(newJobObj).promise()
            .then(res => { console.log("hogaya input"); responseBody = param; })
            .catch(err => { responseBody = { error: err }; });
    }
    else if (event.httpMethod == 'GET') {
        var params = {
            TableName: 'notification_jobs',
        };
        await documentClient.scan(params).promise()
            .then(res => { responseBody = res.Items; })
            .catch(err => { responseBody = { error: err }; });
    }
    else if (event.httpMethod == 'DELETE') {
        if (!requestBody.jobId || requestBody.jobType === '' || requestBody.jobType == undefined || requestBody.jobType == null) {
            return { error: "Job id and Job type is mandatory." };
        }
        var obj = await layer.$lib.dynamoUtils.wrapDynamoItem({ jobId: requestBody.jobId, jobType: requestBody.jobType });
        var params = {
            Key: obj,
            TableName: "notification_jobs"
        };
        console.log(params);
        await dynamoDB.deleteItem(params).promise()
            .then(res => { responseBody = "Successfully deleted."; })
            .catch(err => { responseBody = { error: err }; });
    }

    var response = {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS 
        },
        body: JSON.stringify(responseBody),
    };
    return response;
};
