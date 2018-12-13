let Promise = require("bluebird");
let _ = require("underscore");
const stripeKey = require("stripe");

let stripeService = require("../service/stripe");
const connection = require("../connection");

exports.getDetails = getDetails;
exports.register = register;
exports.transfer = transfer;

function getDetails(req, res) {
  let marketplace_user_id = parseInt(req.body.marketplace_user_id);
  let user_id = req.body.user_id;
  let userStripeKeysResult;
  let stripe_account_number;
  let acc_details;
  let account_status;
  let stripe;
  let where;
  let opts;
  let getConnection;

  Promise.coroutine(function*() {
    getConnection = yield connection.getConnectionForTransaction();
    yield connection.start(getConnection);

    let acc_data = yield stripeService.getAccountDetails(
      user_id,
      getConnection
    );

    if (_.isEmpty(acc_data)) {
      return {
        status: 400,
        message: "Account is not registered with us",
        data: {}
      };
    }
    stripe_account_number = acc_data[0]["stripe_account_number"];

    stripe = stripeKey("PRIVATE KEY");

    acc_details = yield stripe.accounts.retrieve(stripe_account_number);

    let verification_status = yield stripeService.checkVerificationStatus(
      acc_details.legal_entity.verification.status
    );

    if (verification_status) {
      account_status = verification_status;
    } else {
      return {
        status: 400,
        message: "Something went wrong!!"
      };
    }

    if (
      acc_details.legal_entity.verification.status !=
      acc_data[0]["account_status"]
    ) {
      opts = { account_status: account_status };
      where = { user_id: user_id };
      yield stripeService.updateStripeAccDetails(opts, where, getConnection);
    }

    opts = {
      user_id: user_id
    };

    let dataSendToStripe = yield stripeService.getStroreFrontDetails(
      opts,
      getConnection
    );

    try {
      dataSendToStripe = JSON.parse(dataSendToStripe[0].req_body);
    } catch (err) {}

    let finalData = {
      account: {
        first_name: acc_details.legal_entity.first_name,
        last_name: acc_details.legal_entity.last_name,
        city: acc_details.legal_entity.address.city,
        line1: acc_details.legal_entity.address.line1,
        personal_postal_code: acc_details.legal_entity.address.postal_code,
        routing_number: acc_details.external_accounts.data[0].routing_number,
        dob_day: acc_details.legal_entity.dob.day,
        dob_month: acc_details.legal_entity.dob.month,
        dob_year: acc_details.legal_entity.dob.year,
        bank_account_country:
          acc_details.external_accounts.data[0].bank_account_country,
        bank_account_currency:
          acc_details.external_accounts.data[0].bank_account_currency,
        country: acc_details.legal_entity.address.country,
        bank_account_type: acc_details.legal_entity.type,
        business_name: acc_details.legal_entity.business_name,
        line2: acc_details.legal_entity.address.line2,
        bank_account_number: acc_details.external_accounts.data[0].last4,
        phone_no: acc_details.legal_entity.phone_number,
        state: acc_details.legal_entity.address.state,
        personal_address_city: acc_details.legal_entity.personal_address.city,
        personal_address_line1: acc_details.legal_entity.personal_address.line1,
        personal_address_postal_code:
          acc_details.legal_entity.personal_address.postal_code,
        business_vat_id: acc_details.legal_entity.business_vat_id,
        personal_id_number: acc_details.legal_entity.personal_id_number,
        additional_owners: []
      },
      acc_status: verification_status
    };
    yield connection.commitTransaction(getConnection);

    return {
      status: 200,
      message: "SUCCESSFULL",
      data: finalData
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
      connection.rollbackTransaction(getConnection);
      return res.status(400).send(error);
    }
  );
}

function register(req, res) {
 
  let city = req.body.city;
  let line1 = req.body.line1;
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let line2 = req.body.line2;
  let personal_postal_code = req.body.personal_postal_code;
  let state = req.body.state;
  let dob_day = req.body.dob_day;
  let dob_month = req.body.dob_month;
  let dob_year = req.body.dob_year;
  let bank_account_country = req.body.bank_account_country;
  let bank_account_currency = req.body.bank_account_currency;
  let bank_account_number = req.body.bank_account_number;
  let country = req.body.country;
  let routing_number = req.body.routing_number;
  let bank_account_type = req.body.bank_account_type; 
  let ip = req.body.ip;
  let business_name = req.body.business_name; 
  let business_tax_id = req.body.business_tax_id; 
  let ssn = req.body.ssn;
  let user_id = req.body.user_id;
  let maerketplace_user_id = req.body.maerketplace_user_id;

  let opts = {};
  let stripe;
  let stripeKeyResult;
  let stripe_account;
  let account_details;
  let account_status;
  let getConnection;

  Promise.coroutine(function*() {
    getConnection = yield connection.getConnectionForTransaction();

    yield connection.start(getConnection);

    let result = yield stripeService.getAccountDetails(user_id, getConnection);

    if (!_.isEmpty(result)) {
      yield connection.rollbackTransaction(getConnection);
      return {
        status: 400,
        message: "INVALID USER_ID",
        data: {}
      };
    }

    if (ip) {
      try {
        ip = JSON.parse(ip);
      } catch (e) {}
    }

    stripe = stripeKey("PRIVATE KEY");

    stripe_account = {
      object: "bankAccount",
      country: bank_account_country,
      currency: bank_account_currency,
      account_number: bank_account_number
    };

    if (routing_number) {
      stripe_account.routing_number = routing_number;
    }

    let legal_entity = {
      first_name: first_name,
      last_name: last_name,
      type: bank_account_type,
      dob: {
        day: dob_day,
        month: dob_month,
        year: dob_year
      }
    };

    if (bank_account_type == "individual") {
      legal_entity.address = {
        state: state,
        city: city,
        line1: line1,
        postal_code: personal_postal_code
      };
      if (line2) {
        legal_entity.address.line2 = line2;
      }
      legal_entity.ssn_last_4 = ssn.slice(
        ssn.toString().length - 4,
        ssn.toString().length
      );
    }

    if (bank_account_type == "company") {
      legal_entity.address = {
        state: state,
        city: city,
        line1: line1,
        postal_code: personal_postal_code
      };
      if (line2) {
        legal_entity.address.line2 = line2;
      }
      legal_entity.business_name = business_name;
      legal_entity.business_tax_id = business_tax_id;
      legal_entity.ssn_last_4 = ssn.slice(
        ssn.toString().length - 4,
        ssn.toString().length
      );
    }
    account_details = yield stripe.accounts.create({
      country: country,
      type: "custom",
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: ip
      },
      debit_negative_balances: true,
      legal_entity: legal_entity,

      payout_schedule: {
        delay_days: 2,
        interval: "Daily"
      },
      metadata: {
        account_type: "Vendor",
        user_id: user_id
      },
      external_account: stripe_account
    });
    let verification_status = yield stripeService.checkVerificationStatus(
      account_details.legal_entity.verification.status
    );
    if (verification_status) {
      account_status = verification_status;
    } else {
      yield connection.rollbackTransaction(getConnection);
      return {
        status: 400,
        message: "some error occured",
        data: {}
      };
    }

    opts = {
      values: [
        user_id,
        account_details.id,
        account_status,
        bank_account_currency,
        JSON.stringify(account_details)
      ]
    };

    yield stripeService.setStripeAccDetails(opts, getConnection);
    yield connection.commitTransaction(getConnection);

    delete req.body.personal_id_number;
    delete req.body.bank_account_number;
    delete req.body.business_tax_id;
    delete req.body.ssn;

    opts = {
      values: [user_id, JSON.stringify(req.body)]
    };

    stripeService.dataSendToStripe(opts, getConnection);

    return {
      status: 200,
      message: "ACCOUNT ADDED SUCCESSFULLY",
      data: {}
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
      connection.rollbackTransaction(getConnection);
      return res.status(400).send({ status: 400, message: error.message });
    }
  );
}

function transfer(req, res) {
  let job_id = req.body.job_id;
  let marketplace_user_id = req.body.marketplaces_user_id;
  let user_id = req.body.user_id;
  let percentage = req.body.percentage;
  let opts = {};
  let amount;
  let connectionInstance;

  Promise.coroutine(function*() {
    opts = {
      job_id: job_id
    };
    connectionInstance = yield connection.getConnectionForTransaction();
    yield connection.start(connectionInstance);

    let jobDetails = yield stripeService.getJobDetails(opts);

    if (_.isEmpty(jobDetails)) {
      return {
        status: 400,
        message: "INVALID JOB_ID",
        data: {}
      };
    }
    amount = jobDetails[0].amount;
    let transaction_id = jobDetails[0].charge_id;
    let transferAmount = Number((amount * percentage) / 100);
    opts = {
      charge_id: transaction_id,
      amount: transferAmount,
      user_id: user_id,
      marketplace_user_id: marketplace_user_id
    };

    let result = yield stripeService.stripeTransfer(opts, connectionInstance);

    yield connection.commitTransaction(connectionInstance);

    return {
      status: 200,
      message: "successfull Trasnfer",
      data: {}
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
      console.log("error", error);
      connection.rollbackTransaction(connectionInstance);
      return res.status(400).send(error);
    }
  );
}
