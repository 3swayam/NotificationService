
const { ES_ENDPOINT, INDEX, TYPE, username, password } = process.env;
const layer = require('notification-layer');
const { Client } = require('@elastic/elasticsearch');
var CONSTANT = require("./config");
const client = new Client({
    node: ES_ENDPOINT,
    maxRetries: 5,
    requestTimeout: 60000,
    suggestCompression: true,
    compression: "gzip",
    name: "notification-data-es",
    auth: {
        username: username,
        password: password,
        size: 1
    }
});

exports.handler = async (event, context) => {
    var timeDifference = 'HOUR';
    var fromDate = null; var toDate = null;
    var aggregator_flag = true;
    var my_query = { size: 20, from: 0, query: { bool: { filter: [] } } };
    var aggregator = CONSTANT.AGGREGATION_QUERY;
    if (event.date || (event.fromTime && event.toTime)) {

        // date conversion and calculation of duration for fetching

        if (event.fromTime && event.toTime) {
            fromDate = new Date(event.fromTime);
            fromDate = fromDate.getTime().toString();
            toDate = new Date(event.toTime);
            toDate = toDate.getTime().toString();

        } else {
            fromDate = new Date(event.date);
            fromDate = (parseInt(fromDate.getTime()) - CONSTANT.UTC_TO_GMT_DIFFERENCE).toString(); //convert to gmt+5:30
            if (event.toDate) {
                toDate = new Date(event.toDate);
                toDate = (parseInt(toDate.getTime()) - CONSTANT.UTC_TO_GMT_DIFFERENCE + CONSTANT.TIME_DIFFERENCE_DAY).toString();
            }
            else {
                toDate = (parseInt(fromDate) + CONSTANT.TIME_DIFFERENCE_DAY).toString();
            }
        }

        //create range query
        my_query.query.bool.filter.push({
            "range": {
                "timestamp": {
                    "gte": fromDate,
                    "lte": toDate
                }
            }
        });

        //update medium filter if exists
        if (event.medium) {
            aggregator_flag = false;
            my_query.query.bool.must = [];
            my_query.query.bool.must.push({
                "match": {
                    "medium.keyword": event.medium
                }
            });
        }

        //update pagination if exists
        if (event.page) {
            aggregator_flag = false;
            my_query.from = event.page;
        }


        if (aggregator_flag) {
            // calculate time difference and update aggregation query DAY,WEEK,HOUR WISE
            if (toDate - fromDate > CONSTANT.TIME_DIFFERENCE_DAY && toDate - fromDate < CONSTANT.TIME_DIFFERENCE_WEEK) {
                console.log(toDate - fromDate + "=time difference is more than a day.")
                timeDifference = 'DAY';
                aggregator.MEDIUM_TYPE.aggs.DURATION_WISE.date_histogram = CONSTANT.DAY_DIFFERENCE_QUERY;
            }
            else if (toDate - fromDate > CONSTANT.TIME_DIFFERENCE_WEEK) {
                console.log(toDate - fromDate + "=time difference is more than a week.")
                timeDifference = 'WEEK';
                aggregator.MEDIUM_TYPE.aggs.DURATION_WISE.date_histogram = CONSTANT.WEEK_DIFFERENCE_QUERY;
            } else {
                console.log(toDate - fromDate + "=time difference is more than a day.")
                timeDifference = 'HOUR';
                aggregator.MEDIUM_TYPE.aggs.DURATION_WISE.date_histogram = CONSTANT.HOUR_DIFFERENCE_QUERY;
            }
            console.log(timeDifference + "**************** QUERY FOR THIS SEARCH**********", JSON.stringify(aggregator));
            my_query.aggs = aggregator;
        }


        const { body } = await client.search({
            index: INDEX,
            // type: '_doc', // uncomment this line if you are using Elasticsearch ≤ 6
            body: my_query
        });

        //mask Data before sending

        if (body.hits.hits.length > 0) {
            body.hits.hits.forEach(ele => {
                let element = ele["_source"];
                if (element.messageContent) {
                    element.messageContent = layer.$lib.dynamoUtils.maskContent(element.messageContent);
                }
                if (element.medium === CONSTANT.MEDIUM_APP) {
                    if (element.userData && element.userData.deviceKey) {
                        element.userData.deviceKey = layer.$lib.dynamoUtils.maskDeviceKey(element.userData.deviceKey);
                    }
                }
                else if (element.medium === CONSTANT.MEDIUM_SMS) {
                    if (element.userData && element.userData.mobileNo) {
                        element.userData.mobileNo = layer.$lib.dynamoUtils.maskMobileNo(element.userData.mobileNo);
                    }
                }
            });
        }

        //category name update
        if (body.aggregations) {
            if (body.aggregations.CATEGORY_TYPE && body.aggregations.CATEGORY_TYPE.buckets) {
                let listOfCategories = body.aggregations.CATEGORY_TYPE.buckets;
                listOfCategories.forEach(ele => {
                    var index = CONSTANT.CATEGORYLIST.indexOf(ele.key);
                    if (index != -1) { ele.key = CONSTANT["CATEGORY_" + ele.key].NAME; }
                });
            }
            if (body.aggregations.MEDIUM_TYPE && body.aggregations.MEDIUM_TYPE.buckets) {
                let listOfMediums = body.aggregations.MEDIUM_TYPE.buckets;
                listOfMediums.forEach(ele => {
                    if (ele.CATEGORY_TYPE && ele.CATEGORY_TYPE.buckets) {
                        let listOfCategories = ele.CATEGORY_TYPE.buckets;
                        listOfCategories.forEach(elem => {
                            var index = CONSTANT.CATEGORYLIST.indexOf(elem.key);
                            if (index != -1) { elem.key = CONSTANT["CATEGORY_" + elem.key].NAME; }
                        });
                    }
                });
            }
        }

        var result = {
            timeDifference: (body.aggregations ? timeDifference : null),
            totalCount: body.hits.total.value,
            notification: body.hits.hits,
            chartValue: (body.aggregations ? body.aggregations : {})
        };
        return result;

    } else {
        return { error: "Date field is mandatory", totalCount: 0, notification: [], chartValue: {} };
    }
};


