zip -r notification-data-es.zip index.js node_modules config.json
aws lambda update-function-code --function-name notification-data-es --zip-file fileb://notification-data-es.zip