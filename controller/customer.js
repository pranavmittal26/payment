let Promise        = require('bluebird');
let _              = require('underscore');

let userServices   = require('../service/user');

exports.signup = signup;

function signup(req, res){
    let first_name = req.body.first_name;
    let last_name  = req.body.last_name;
    let email      = req.body.email;
    let password   = req.body.password;
    let phone_no   = req.body.phone_no;
    let opts={};

    Promise.coroutine(function*(){
        opts ={
            email : email
        }
        let userDetails = yield userServices.getUserDetails(opts);

        if(!_.isEmpty(userDetails)){
            return ({
                status   : 400,
                message  : "User Exist"
            });
        }
        opts={
            values :[first_name,last_name,email,password,phone_no]
        };
        yield userServices.insertUser(opts);
        return ({
            status  : 200,
            message : "Succesfully registered",
            data    :{}
        })
    })().then((result)=>{
        return res.status(200).send({status:result.status,message:result.message,data:result.data});
    },(error)=>{
        return res.status(400).send({status:400,message:error});
    });
}
