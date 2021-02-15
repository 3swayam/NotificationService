var FCM = require('fcm-node');
var config = require("./config");
var serverKey = config.APP.FCM_API_KEY; //put your server key here
var fcm = new FCM(serverKey);
const layer = require('notification-layer');
exports.handler =   (event) => {
    console.log("Length of Queue ", event.Records.length);
   
    event.Records.forEach( (record) => {
        var message = { 
            
            notification: {
                title: record.messageAttributes.title.stringValue,
                body: record.body,
                click_action:"FCM_PLUGIN_ACTIVITY",
                sound:"default",
                icon:"fcm_push_icon",
                color:"#00A2B2",
                image:"",
                tag:"CHAT_MESSAGE"
            },

            data: {  //you can send only notification or only data(or include both)
                timestamp: Date.now(),
                client_id: record.messageAttributes.userId.stringValue,
                notificationId: record.messageAttributes.notificationId.stringValue,
                message: record.body,
                notificationType: record.messageAttributes.notificationCategory.stringValue //1: NOTIFICATION_TYPE_CHAT_ROOM
            }
        };
        console.log('Sending to FCM for ',record.messageAttributes.notificationId.stringValue);
    
        var success =[];
        var error = [];
        var deviceKeys = record.messageAttributes.deviceKey.stringValue.split(",");
        for(var i=0;i<deviceKeys.length;i++){
            var fcmmessage = message;
            fcmmessage.to = deviceKeys[i];
            fcm.send(fcmmessage, function (err, response) {
                if (err) {
                    
                    console.log("Error : for notfication Id ",fcmmessage.data.notificationId);
                    var errupdated =  layer.$lib.dynamoUtils.updateError(fcmmessage.data.notificationId,fcmmessage.data.client_id,err);
                    errupdated.then(function(updated){
                        console.log("successfully updated error status in db for",fcmmessage.data.notificationId," ",updated);
                    });
                    return err;
                } else {
                    console.log("Success: Sent with response: ", response, "for ",fcmmessage.data.notificationId);
                    var updated = layer.$lib.dynamoUtils.updateSuccess(fcmmessage.data.notificationId,fcmmessage.data.client_id,response);
                    updated.then(function(sucessupdated){
                        console.log("successfully updated success status in db for",fcmmessage.data.notificationId," ",sucessupdated);
                    });
                    return response;
                }

            }); 
        }   
    });
};
