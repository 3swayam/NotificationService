var FCM = require('fcm-node');
var config = require("./../config");
//var dynamoservice = require("./../dynamo-service");

//const FCM_API_KEY = "AAAAsXpk-aQ:APA91bFmIxiLLga-9VTxC7ygbBewZiKwmb8eX8GVhnHZdJdjsA38WEaX4hKsr5eO2tqnp8Kk9E3LjQCiJPwjgXVWwgXDQ4_TFW0VkKjwClHYYVRlb4HODf3hINejFbY4beRCBpS1Qtno"
var FCM_WELLNESS_API_KEY = config.APP.FCM_API_KEY;
var serverKey = FCM_WELLNESS_API_KEY; //put your server key here
var fcm = new FCM(serverKey);
var KUNJ_KEY = ["d83CR0fsQxE:APA91bFRhwAQICdrLRIbV5hjS4MRvTdVj4y894Ovwgxm6u9T0LVr9HJfXC9Sqgnf8BqA4JoVCLIwGuX8v3pd51-VQoNLIxLh4xTuf_xJPB4VkE7C8ORGoYfyugXQnvYdUIYPmAEfJPn"];
//exports.handler =  (event) => {
    //console.log("Length of Queue ", event.Records.length);
    //todo: remove below console to support Hippa compliance
    //console.log(JSON.stringify(event));
   // var record = event.Records[0];
function test(){
for(var j=0;j<2;j++){
    console.log("Sendin  ",j);
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: KUNJ_KEY[0],
        collapse_key: FCM_WELLNESS_API_KEY,
        
        notification: {
            title: "Test",
            body:"Test"
        },

        data: {  //you can send only notification or only data(or include both)
            timestamp: Date.now(),
            client_id: 'record.messageAttributes.userId.stringValue',
            notificationId: 'record.messageAttributes.notificationId.stringValue',
            message: 'Test',
            notificationType: 'record.messageAttributes.notificationCategory.stringValue' //1: NOTIFICATION_TYPE_CHAT_ROOM
        }
    };
    console.log('Sending to FCM');
 //   console.log("Payload ",JSON.stringify(message));
    success =[];
    error = [];
    for(var i=0;i<KUNJ_KEY.length;i++){
        message.to = KUNJ_KEY[i];
        fcm.send(message, function (err, response) {
            if (err) {
                 error.push(err);
                 console.log("Error: ",error);
                return err;
            } else {
               // console.log("Successfully sent with response: ", response, "for ",message.data.notificationId);
                success.push(response);
                console.log("Success: ",success);
            //    dynamoservice.updateSuccess(message.data.notificationId,message.data.client_id,response);
                return response;
            }

        });
        
    }
    console.log("return");
    
}
//return "happy";
//    console.log("Success Message",success);
 //   console.log("Error MEssage",error);
//};
}
console.log(test());
