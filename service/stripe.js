let Promise                        = require('bluebird');
let _                              = require('underscore');
const stripe_mod                   = require('stripe');

let con                      = require('../connection');

exports.getAccountDetails          = getAccountDetails;
exports.getStripeKeys              = getStripeKeys;
exports.checkVerificationStatus    = checkVerificationStatus;
exports.setStripeAccDetails        = setStripeAccDetails;
exports.updateStripeAccDetails     = updateStripeAccDetails;
exports.dataSendToStripe           = dataSendToStripe;
exports.getStroreFrontDetails      = getStroreFrontDetails;
exports.createCharge               = createCharge;
exports.getToken                   = getToken;
exports.insertJobDetails           = insertJobDetails;
exports.getJobDetails              = getJobDetails;
exports.stripeTransfer             = stripeTransfer;

function getStripeKeys(user_id,connectionInstance){
    return new Promise((resolve,reject)=>{
        let sql  = "SELECT * FROM tb_stripe_keys WHERE user_id =? "
        let params=[user_id];

        con.executeTransaction(sql,params,connectionInstance)
        .then((result)=>{
            return resolve(result);
        }) .catch((ex)=>{
            return reject(ex);
        })
    })
}

function getAccountDetails(user_id,conInstance){
    return new Promise((resolve,reject)=>{
        let sql = "SELECT * FROM tb_stripe_account_details WHERE user_id=? "
        let params=[user_id];

        con.executeTransaction(sql,params, conInstance).
        then((result)=>{
            return resolve(result);
        }) .catch((ex)=>{
            con.rollbackTransaction(conInstance).then(()=>{
                return reject(ex);
            }) .catch((error)=>{
                return reject(error);
            });
        })
    })
}

function checkVerificationStatus(account_status){    
    
    /*
      * possible status verified, unverified, pending
     */
    return new Promise((resolve, reject)=>{
        if(account_status == "pending") {
            resolve("PENDING");
          } else if(account_status == "verified") {
            resolve( "VERIFIED");
          } else if(account_status == "unverified") {
            resolve("UNVERIFIED");
          } else {            
            resolve(0);
          }
    });
}

function setStripeAccDetails(opts,conInstance){
    return new Promise((resolve,reject)=>{
        let sql =" INSERT INTO tb_stripe_account_details(user_id, stripe_account_number, account_status, currency, stripe_return_obj) VALUES(?,?,?,?,?)";

        con.executeTransaction(sql,opts.values,conInstance).then((result)=>{
            return resolve(result);
        }) .catch((ex)=>{
            con.rollbackTransaction(conInstance).then(()=>{
                return reject(ex);
            }) .catch((error)=>{
                return reject(error);
            })
            
        })
    });
}

function updateStripeAccDetails(opts, where, connectionInstance){
    return new Promise((resolve,reject)=>{            
        let sql ="UPDATE tb_stripe_account_details SET account_status=?  WHERE user_id=? "
        let params=[opts.account_status,where.user_id];

        if (where.hasOwnProperty('stripe_account_number')) {
            sql += " AND stripe_account_number = ? ";
            params.push(where.stripe_account_number);
        }        
        con.executeTransaction(sql, params, connectionInstance).then((result)=>{  
            console.log("seeer",)                            
            return resolve();
        }) .catch((ex)=>{
             return reject(ex);
        })
    })
}

function dataSendToStripe(opts,connectionInstance){
    return new Promise((resolve, reject) => {
        var query = `INSERT INTO tb_storefront_details_send_to_stripe (user_id,req_body) 
                     VALUES (?,?) `;
        con.executeTransaction(query, opts.values,connectionInstance).then((result) => {
          resolve(result);
        }, (error) => {
          reject(error);
        });
    });
}

function getStroreFrontDetails(opts,connectionInstance){
    return new Promise((resolve, reject) => {
        var values = [opts.user_id];
        var columns = opts.columns || `*`;
        var query = `SELECT ${columns} FROM tb_storefront_details_send_to_stripe WHERE user_id = ? 
                   ORDER BY id DESC LIMIT 1 `;    
    
        con.executeTransaction(query, values,connectionInstance).then((result) => {
          return resolve(result);
        }, (error) => {
          return reject(error);
        });
    });    
}

function getToken(opts,stripeKeys){
    return new Promise((resolve, reject)=>{
        let stripe = stripe_mod(stripeKeys);

        stripe.tokens.create({
            card: {
                "number"    : opts.card_number,
                "exp_month" : opts.exp_month,
                "exp_year"  : opts.exp_year,
                "cvc"       : opts.cvc
            }
        },function(err, token){
            if(err){
                return reject(err.message);
            }
            return resolve(token.id);
        });
    });
}

function createCharge(opts,stripeKeys){
    return new Promise((resolve,reject)=>{
        let stripe = stripe_mod(stripeKeys);

        stripe.charges.create({
            amount : opts.amount *100,
            currency : "usd",
            source : opts.token
            // descripton : `charge for ${opts.email}`
        },function(err,charge){
            if(err){
                return reject(err.message);
            }
            return resolve(charge);
        })
    })
}

function insertJobDetails(opts,connectionInstance){
    return new Promise((resolve,reject)=>{
        let sql = "INSERT INTO tb_job_payment_details(job_id,user_id,amount,charge_id) VALUES(?,?,?,?)";

        con.executeTransaction(sql,opts.values,connectionInstance).then((result)=>{
            return resolve();
        }).catch((error)=>{
            con.rollbackTransaction(connectionInstance).then(()=>{
                return reject(error);
            }).catch((err)=>{
                return reject(err);
            });
            
        });
    });
}

function getJobDetails(opts){
    return new Promise((resolve,reject)=>{
        let sql ="SELECT * FROM tb_job_payment_details WHERE 1=1 "
        let params =[];

        if(opts.user_id){
            sql+=" AND user_id =?";
            params.push(opts.user_id);
        }
        if(opts.job_id){
            sql+=" AND job_id=? ";
            params.push(opts.job_id);
        }
        con.executeQueryPromisfy(sql,params).then((result)=>{
            return resolve(result);
        }).catch((error)=>{
            return reject(error);
        });
    });
}

function stripeTransfer(opts,connectionInstance){ 
    return new Promise((resolve,reject)=>{
        Promise.coroutine(function*(){
            let stripeKeys = yield getStripeKeys(opts.marketplace_user_id,connectionInstance);
            if(_.isEmpty(stripeKeys)){
                throw ({
                    status  : 400,
                    message : "NO_KEY_FOUND",
                    data    : []
                });
            }
            let account_id = yield getAccountDetails(opts.user_id,connectionInstance);

            if(_.isEmpty(account_id)){
                throw({
                    status :400,
                    message : "REGISTER FIRST",
                    data   : []
                })
            }
            let stripe = stripe_mod(stripeKeys[0].private_key);
            let transObject ={
                amount   : (opts.amount*100).toFixed(0),
                currency : 'usd',
                destination : account_id[0].stripe_account_number,
                source_transaction : opts.charge_id
            }
            let transferResult = yield stripe.transfers.create(transObject);
            return ({
                status  : 200,
                message : "successfully tranfer",
                data    : transferResult
            });
        })().then((result)=>{
            return resolve(result);
        },(error)=>{            
            return reject(error.message);
        });
    });
}