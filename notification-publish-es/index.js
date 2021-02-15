 
const { ES_ENDPOINT, INDEX, TYPE, username,password } = process.env;

const { Client } = require('@elastic/elasticsearch');
var attr = require('dynamodb-data-types').AttributeValue;

const client = new Client({
    node: ES_ENDPOINT,
    maxRetries: 5,
    requestTimeout: 60000,
    suggestCompression: true,
    compression: "gzip",
    name: "notification-publish-es",
    auth: {
        username: username,
        password: password,
        size: 1
    }
});

exports.handler = async (event, context) => {
  //console.log('Received event:', JSON.stringify(event, null, 2));
  for (const record of event.Records) {
      console.log('DynamoDB Record Event: %j', record.eventName);
      
      if(record.eventName === 'INSERT' || record.eventName === 'MODIFY'){
          
          let jsonDoc = attr.unwrap(record.dynamodb.NewImage);      
          jsonDoc = transform(jsonDoc);
          console.log("Look for ",jsonDoc.notificationId);
          try{
          var response = await client.index({
              index: INDEX,
              id: jsonDoc.notificationId,
              // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
              body: jsonDoc
            });
           
          }catch(error){
            console.log("Error in index");
            console.log(error);
          }            
          
        }else{
          console.log("Ignore ",record.eventName);
      }
  }

  await client.indices.refresh({ index: INDEX});
  
  return ;
// return `Successfully processed ${event.Records.length} records.`;
};


function transform(jsonDoc){
           //console.log("JSON Doc");
           jsonDoc.userData = converToJson(jsonDoc.userData);
           jsonDoc.notification_date = new Date(parseInt(jsonDoc.timestamp));
           jsonDoc.errorobject = converToJson(jsonDoc.errorobject);
           jsonDoc.success = converToJson(jsonDoc.success);
           jsonDoc.mediumsuccess =converToJson(jsonDoc.mediumsuccess);
           return jsonDoc;
}
function converToJson(data){
 // console.log("typeof ", (typeof data));
  if(typeof data === 'string'){
    try{
      return JSON.parse(data);
    }catch(err){
      //IF strig is not JSON, store as a JSON
      var message = {
        "data":data
      };
      return message;
    }
  }else if (typeof data === 'object'){
    return data;
  }else{
    return null;
  }
}