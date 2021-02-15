
// v1.1.2

var zlib = require('zlib');

const { ES_ENDPOINT, INDEX, NOTIFICATION_INDEX, TYPE, username,password } = process.env;

const { Client } = require('@elastic/elasticsearch');

const client = new Client({
    node: ES_ENDPOINT,
    maxRetries: 5,
    requestTimeout: 60000,
    suggestCompression: true,
    compression: "gzip",
    name: "LogsToElasticsearch_fft-notification-dev",
    auth: {
        username: username,
        password: password,
        size: 1
    }
});

var logFailedResponses = false;

exports.handler =   (input, context) => {
    // decode input from base64
 
    var zippedInput = new Buffer.from(input.awslogs.data, 'base64');

    // decompress the input
     zlib.gunzip(zippedInput,  async(error, buffer) => {
      //var buffer =  await zlib.gunzip(zippedInput) ;
        if (error) { 
            console.log("Error while gunzip");
            console.log(error);
            context.fail(error); 
            return; 
            
        }

        // parse the input from JSON
        var awslogsData = JSON.parse(buffer.toString('utf8'));

        // transform the input to Elasticsearch documents
        //  // post documents to the Amazon Elasticsearch Service
        var body =  await post(awslogsData);
        // skip control messages
        if (!body) {
            console.log('Received a control message');
            
        }else{
            console.log("Stored successfully");
        }
        
        //context.succeed('Control message handled successfully');
       
                
      },()=>{
          console.log("Done");
          return;
      });
      console.log("request completed");
};
 async function post(payload) {
    if (payload.messageType === 'CONTROL_MESSAGE') {
        console.log("control message");
        return {controlMessage:true};
    }

    var bulkResponseBody = '';

  
      for(const logEvent of payload.logEvents){
        var source = buildSource(logEvent.message, logEvent.extractedFields);
        console.log("Look for ",source.notification.messageId);
        const  result  =  await client.search({
                            index: NOTIFICATION_INDEX,
                            // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
                            body: {
                              query: {
                                match: { "success.MessageId.keyword": source.notification.messageId }
                              }
                            }
                          });          
         
          const hits = result.body.hits.hits; 
         
          if(hits.length >= 1){
              let noficationid = hits[0]._id;
              let body = hits[0]._source;
              body.success = null;
              body.notificationStatus = '0';
              body.errorobject = source;
              let response =  await client.index({
                  index: NOTIFICATION_INDEX,
                  id: noficationid,
                  // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
                  body: body
                });
                console.log("Response Received");
                bulkResponseBody+=[JSON.stringify(response)];
          }else{
              console.log("ERROR : ",source.notification.messageId, " not found in notification Index" );
                source['id'] = logEvent.id;
                source['timestamp'] = new Date(1 * logEvent.timestamp).toISOString();
                source['message'] = logEvent.message;
                source['owner'] = payload.owner;
                source['log_group'] = payload.logGroup;
                source['log_stream'] = payload.logStream;

              let response =  await client.index({
                  index: INDEX,
                  id: logEvent.id,
                  // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
                  body: source
                });
                console.log("Response Received");
                bulkResponseBody+=[JSON.stringify(response)];
          }
      }
          return bulkResponseBody;
    }

function buildSource(message, extractedFields) {
    if (extractedFields) {
        var source = {};

        for (var key in extractedFields) {
            if (extractedFields.hasOwnProperty(key) && extractedFields[key]) {
                var value = extractedFields[key];

                if (isNumeric(value)) {
                    source[key] = 1 * value;
                    continue;
                }

                let jsonSubString = extractJson(value);
                if (jsonSubString !== null) {
                    source['$' + key] = JSON.parse(jsonSubString);
                }

                source[key] = value;
            }
        }
        
        return source;
    }

    var jsonSubString = extractJson(message);
    if (jsonSubString !== null) {
        return JSON.parse(jsonSubString);
    }

    return {};
}

function extractJson(message) {
    var jsonStart = message.indexOf('{');
    if (jsonStart < 0) return null;
    var jsonSubString = message.substring(jsonStart);
    return isValidJson(jsonSubString) ? jsonSubString : null;
}

function isValidJson(message) {
    try {
        JSON.parse(message);
    } catch (e) { return false; }
    return true;
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}





function logFailure(error, failedItems) {
    if (logFailedResponses) {
        console.log('Error: ' + JSON.stringify(error, null, 2));

        if (failedItems && failedItems.length > 0) {
            console.log("Failed Items: " +
                JSON.stringify(failedItems, null, 2));
        }
    }
}