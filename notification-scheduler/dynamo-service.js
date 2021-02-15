
const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1' });
const documentWrite =  new AWS.DynamoDB({ apiVersion: '2012-08-10' });

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
    isJobExecuted: async(jobId) => {
        var currentdate = new Date();
        var previousdate = new Date();
        const TIME_INTERVAL = 5;
        previousdate.setMinutes( currentdate.getMinutes() - TIME_INTERVAL );
        currentdate = currentdate.toLocaleString();
        previousdate = previousdate.toLocaleString();
        console.log("Current Date",currentdate," Previous Date",previousdate);
        var params = {
            TableName: "notification_jobs_status",
            IndexName: "jobId-executedAt-index",
            KeyConditionExpression: "jobId = :j and executedAt between :stime and :ltime",
            ExpressionAttributeValues: {
                ":j": jobId,
                ":stime": previousdate,
                ":ltime" : currentdate,
            }
        };
        const result = await documentClient.query(params).promise();
        if(result.Count>=1){
            console.log(jobId, " was executed ", result.Count, " times");
            return true;
        }else{
            console.log(jobId, " was not executed before within last ", TIME_INTERVAL , " mins");
            return false;
        }
        
    },
    insertDocument: async(job,currentdate) => {
            var jobStatusInsertParams = {
                TableName: 'notification_jobs_status',
                Item: {}
            };
        
             var record = {
                'uniqueKey' : {S: job.uniqueKey},
                'jobType' : {N: (job.jobType).toString()},
                'jobId' : {S : job.jobId},
                'cron' : {S : job.cron},
                'Timezone' : {S : job.Timezone},
                'executedAt' : {S : currentdate.toLocaleString()},
                'jobStatus' : {N : '-1' }
             };
             jobStatusInsertParams.Item = record ;
             
             console.log("Inserting..  ",jobStatusInsertParams);
             return documentWrite.putItem(jobStatusInsertParams).promise();
        
    },
    updateSuccess: async (uniqueKey, jobType) => {
       
        var params = {
            TableName: 'notification_jobs_status',
            Key: {
               uniqueKey: uniqueKey,
               jobType: jobType
            },
            UpdateExpression: "set jobStatus = :r, jobError = :e",

            ExpressionAttributeValues: {
                  ":r":1,
                  ":e":""
            }
        };

        return documentClient.update(params).promise();
    },
   
    updateError: async (uniqueKey, jobType, errorobject) => {
       var params = {
            TableName: 'notification_jobs_status',
            Key: {
               uniqueKey: uniqueKey,
               jobType: jobType
            },
            UpdateExpression: "set jobStatus = :r, jobError = :e",

            ExpressionAttributeValues: {
                  ":r":1,
                  ":e":errorobject
            }
        };

        return documentClient.update(params).promise();
    }
};