const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'ap-south-1', apiVersion: '2012-08-10' });

var axios = require('axios');
var utils = require('./utils'); 
var dynamoService = require('./dynamo-service');
var config = require("./config");
exports.handler = async (event) => {
    
    console.log(event);
    
   
    if(event.key1 == 'value1'){
        console.log("checking is job executed?")
        var result = await dynamoService.isJobExecuted("J103");
        return "success";
    }
    var currentdate = new Date();    
    var params = {
        TableName: "notification_jobs",
        IndexName: "jobId-index",

        ScanIndexForward: false   // true = ascending, false = descending

    };
    
   
    var allJobs = await documentClient.scan(params).promise();
    
    allJobs.Items.forEach ( async (job) =>  {
    //for(var job of allJobs.Items){
         try{        
         
          var cron = job.cron;
          var tz = job.Timezone;
          console.log("Job Details ",job);
          if(utils.isMatch(cron,currentdate,tz)){
             console.log("Check whether Job is already Executed or not?");
             var isExecutedBefore = await dynamoService.isJobExecuted(job.jobId);
             if(job.jobId && !isExecutedBefore ){
                 console.log("Call notification generator for ",job.jobId);
                 var uniqueId = currentdate.getTime()+"_"+job.jobId;
                 job.uniqueKey = uniqueId;
                 dynamoService.insertDocument(job,currentdate).then(result => {
                     console.log(job.jobId," Inserted successfully");
                 }).catch(err => {
                     console.log("Could not inserted",err);
                 });
                 console.log("calling .. ",config.GENERATOR_API_END);
                 axios.post(config.GENERATOR_API_END,job).then(response => {
                            console.log("Successfully executed notification generator Job ");
                            
                            const jobdetail = response.data;
                            dynamoService.updateSuccess(jobdetail.uniqueKey,jobdetail.jobType).then(result => {
                                console.log("Updated success message successfully");
                            }).catch(err => {
                                console.log("Error", err);
                            });
                                                    
                 }).catch(err =>{
                            console.log("Error in execution of notification generator");
                            console.log(err);
                            dynamoService.updateError(job.uniqueKey,job.jobType,err).then(result => {
                                console.log("Updated error message successfully");
                            }).catch(error => {
                                console.log("Error", error);
                            });
                });    
             }
          }else{
              //console.log("US TZ: ",currentdate);
              //let d = new Date(currentdate.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
              //console.log("Ind TZ",d);
              //console.log("Not initiated yet");
          }
        } catch (err) {
            console.log(err);
            console.log('Error: ' + err.message);
        }
    //}
    });
   
 return;
};
