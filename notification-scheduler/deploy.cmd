winrar a -afzip notification-scheduler index.js utils.js node_modules
aws lambda update-function-code --function-name notification-scheduler --zip-file fileb://notification-scheduler.zip