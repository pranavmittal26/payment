let express                 = require('express');
let bodyParser              = require('body-parser');

let connection              = require('./connection');
let stripeCon               = require('./controller/stripecon');
let stripe                  = require('./controller/stripe');
let customer                = require('./controller/customer');

let app  = express();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.post('/register',  stripeCon.register);
app.post('/getDetails', stripeCon.getDetails);
app.post('/transfer',  stripeCon.transfer);
app.post('/customerSignup',  customer.signup);
app.post('/charge', stripe.charge);

let server = require('http').createServer(app);
let PORT = process.env.PORT || 3000 ;

server.listen(PORT,()=>{
    connection.connect();
    console.log("the server is listening on .......",PORT);
})
