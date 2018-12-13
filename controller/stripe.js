let Promise = require("bluebird");
let _ = require("underscore");

let stripeServices = require("../service/stripe");
let customer = require("../service/user");
let connection = require("../connection");

exports.charge = charge;

function charge(req, res) {
  let user_id = req.body.user_id;
  let marketplace_user_id = req.body.marketplace_user_id;
  let card_number = req.body.card_number;
  let exp_month = req.body.exp_month;
  let exp_year = req.body.exp_year;
  let cvc = req.body.cvc;
  let email = req.body.email;
  let amount = req.body.amount;
  let job_id = req.body.job_id;
  let connectionInstance;
  let opts = {};

  Promise.coroutine(function*() {
    opts = {
      user_id: user_id,
      email: email
    };
    let userDetail = yield customer.getUserDetails(opts);

    if (_.isEmpty(userDetail)) {
      return {
        status: 400,
        message: "INVALID USER EMAIL OR ID",
        data: userDetail
      };
    }

    connectionInstance = yield connection.getConnectionForTransaction();
    yield connection.start(connectionInstance);

    let stripeKeys = yield stripeServices.getStripeKeys(
      marketplace_user_id,
      connectionInstance
    );

    if (_.isEmpty(stripeKeys)) {
      return {
        status: 200,
        message: "INAVLID USER ID ",
        data: []
      };
    }
    opts = {
      card_number: card_number,
      exp_month: exp_month,
      exp_year: exp_year,
      cvc: cvc
    };
    let tokenId = yield stripeServices.getToken(
      opts,
      stripeKeys[0].private_key
    );
    amount = amount.toFixed(2);
    opts = {
      amount: amount,
      token: tokenId,
      email: email
    };

    let chargeDetails = yield stripeServices.createCharge(
      opts,
      stripeKeys[0].private_key
    );

    opts = {
      values: [job_id, user_id, amount, chargeDetails.id]
    };

    yield stripeServices.insertJobDetails(opts, connectionInstance);

   

    yield connection.commitTransaction(connectionInstance);

    return {
      status: 200,
      message: "SUCCESSFULL PAYMENT",
      data: `YOUR ORDER_ID IS ${chargeDetails.id}`
    };
  })().then(
    result => {
      return res
        .status(200)
        .send({
          status: result.status,
          message: result.message,
          data: result.data
        });
    },
    error => {
      connection.rollbackTransaction(connectionInstance);
      return res.status(400).send({ status: 400, message: error });
    }
  );
}
