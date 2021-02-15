var parser = require('cron-parser');

module.exports = {
     isMatch: (expression, currentdate, tz) => {
        let date = currentdate;
        try{
            date = new Date(currentdate.toLocaleString("en-US", {timeZone: tz}));
        }catch(err){
            console.log("Error : In correct Time  zone. Can not execute this job");
            return false;
        }
        var interval = parser.parseExpression(expression);
        var data = interval._fields;
       // console.log(data);
        if (!data.second.includes(date.getSeconds())) {
            //console.log("sec not match");
        return false;
        }
        if (!data.minute.includes(date.getMinutes())) {
            //console.log("minute not match");
        return false;
        
        }
        if (!data.hour.includes(date.getHours())) {
            //console.log("hour not match");
        return false;
        }
        if (!data.dayOfMonth.includes(date.getDate())) {
            //console.log("dayOfMonth not match");
            return false;

        }
        if (!data.month.includes(date.getMonth() + 1)) {
            //console.log("month not match");
            return false;
        }
        if (!data.dayOfWeek.includes(date.getDay())) {
            //console.log("dayOfWeek not match");
            return false;
        }
        return true;
    }
}