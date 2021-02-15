# update layers in any fucntion

aws lambda update-function-configuration --function-name notification-medium-construction --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-app-subscriber --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-scheduling --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-sms-sender --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-request-receive --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-sms-queue-publisher --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-get-all --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-data-es --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-job-task --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23
aws lambda update-function-configuration --function-name notification-pinpoint-subscriber --layers arn:aws:lambda:ap-south-1:014137093647:layer:notification-layer:23