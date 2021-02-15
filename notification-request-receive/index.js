const layer = require('notification-layer');
const batchSize = 25;
exports.handler = async (event, context, callback) => {
    if (event.length > layer.$lib.dynamoUtils.MAX_ARRAY_SIZE) {
        return layer.$lib.dynamoUtils.ERROR_ARRAY_OUT_OF_LIMIT; //tobe done later
    } else {
        var batchList = [];
        var failedResponseList = [];
        for (let i = 0; i < event.length; i++) {

            var validatedElement = await layer.$lib.dynamoUtils.validateObject(event[i], i + 1);
            if (validatedElement.PutRequest.Item.errorobject.S != "") {
                console.log("User Id : " + event[i].userId + " Error code :", validatedElement.PutRequest.Item.errorobject.S);
                var obj = {}; obj[i] = event[i];
                obj[i]["notificationStatus"] = validatedElement.PutRequest.Item.notificationStatus.S;
                obj[i]["errorobject"] = validatedElement.PutRequest.Item.errorobject.S;
                failedResponseList.push(obj);
            }
            console.log("Validated object is received for  :" + event[i].userId);
            batchList[batchList.length] = validatedElement;
        }
        console.log("**INSERTION WILL BE INITITATED with batch size = " + batchList.length + " and failed list=" + failedResponseList.length);
        if (batchList.length > 0) {
            var listOfBatches = [];
            for (var i = 0, len = batchList.length; i < len; i += batchSize)
                listOfBatches.push(batchList.slice(i, i + batchSize));
            console.log("**DIVIDE BATCHLIST INTO BATCHES", listOfBatches.length);

            var batchResultSet = { "processedNotification": [], "successNotificationList": 0, "failedResponseList": failedResponseList };
            for (let index = 0; index < listOfBatches.length; index++) {
                const element = listOfBatches[index];
                let writeItems = await layer.$lib.dynamoUtils.batchWrite(element);
                //unwrap batch items
                for (let i = 0; i < element.length; i++) {
                    element[i] = await layer.$lib.dynamoUtils.unwrapDynamoItem(element[i].PutRequest.Item);
                }

                batchResultSet["processedNotification"].push(...element);
                batchResultSet["successNotificationList"] += element.length;
                setTimeout(function () { }, 5);
                console.log("**INSERTION COMPLETE FOR BATCH---->", index);
            }
            return batchResultSet;
        } else {
            return { failedResponseList: failedResponseList };
        }
    }
};