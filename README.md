App is live under: https://renocar-zgloszenie.pl/ (You can register your car for repair!)
contains also portal which is hosted for private usage of car repair shop (will add screens/video of portal web page)

App will containt:

- single backend that will store submission for given period of time
- frontend for client to fill submission form
- frontend for receptionist to handle forms and in future respond with email to them

Tech stack: backend spring boot modular monolith folowing ddd practices (hosted on AWS with: S3, DynamoDB, Elastic Beanstalk, Route53, CloudFront):

- repair request module (submission, request management by garage)
- availability module (available days for appointment schedule)
- notification module (asynchronous communication)

First design level event storming done:
![image](https://github.com/DamianMarek98/car-repair-shop-request-submission/assets/43189598/a6771d67-e291-424d-90ed-6750a00d0610)

To consider:

- what to do with client data, should be deleted after one month?
- common error response could be prepared to show exact information what is wrong with request to the client 
