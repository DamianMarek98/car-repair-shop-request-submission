App is live under: https://renocar-zgloszenie.pl/ (You can register your car for repair!)
contains also portal which is hosted for private usage of car repair shop (will add screens/video of portal web page)

Recently refactored application to fully serverless infrastructure - transition from EC2 to couple of lambdas (migration due to cost optimization):
- Rest Api Gateway + Lambda for new repair request submission
- Rest Api Gateway + Lambda for Spring boot service with RequestStreamHandler as a Bridge between lambda trigger and spring rest api
- SNS + Lambda + SNS for listening to DynamoDb events and on new repair request save notifying clients about new submission using lambda + SNS email notifications (was done before migration)

Current archtiecture state:
<img width="1068" height="681" alt="repair-request drawio" src="https://github.com/user-attachments/assets/7a087467-7eeb-4ed5-adb6-0e3ae038051d" />

App will containt:

- single backend that will store submission for given period of time
- frontend for client to fill submission form
- frontend for receptionist to handle forms and in future respond with email to them

Tech stack: backend spring boot modular monolith folowing ddd practices (hosted on AWS with: EC2, S3, DynamoDB, Elastic Beanstalk, Route53, CloudFront, API Gateway):

- repair request module (request management by garage + availability management)
- separate module for submission (for lambda cold start reduction)
- availability module (available days for appointment schedule)
- notification lambda (async serverless communication)

First design level event storming done:
![image](https://github.com/DamianMarek98/car-repair-shop-request-submission/assets/43189598/a6771d67-e291-424d-90ed-6750a00d0610)

