winrar a -afzip notification-publish-es index.js node_modules
aws lambda update-function-code --function-name notification-publish-es --zip-file fileb://notification-publish-es.zip