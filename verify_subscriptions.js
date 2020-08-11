var MongoClient = require('mongodb').MongoClient;
var paypal = require('paypal-rest-sdk');
var winston = require('winston');

const dbURL = "mongodb+srv://mjperry91:Reikken91@cluster0-lcoq0.mongodb.net/test?retryWrites=true"
var usersCollection;
var accountsCollection;

paypal.configure({
  mode: 'sandbox',
  client_id: 'AeJ4LS5Ll4C_1CV-5_VI1DNXtkdm-yjvz7ZT4rkm4z6AtNih-nkV39u7oHsjhzLidYdmc9ky124QGMwn',
  client_secret: 'ECDqy3JL_c2_7gf1lhN9qAH9nisuwK4PNgc9q0R12-QjIPyCc4W2reaJtgqnFGy4grYdpJtnWlh8qftj'});
/*
paypal.configure({
  mode: 'live',
  client_id: 'ARjtN9_oxjspEZRaVMNtPqMB2jjDN3VsRo3i46hkczw52uB0hXBtNtIeFMhCHPRZ2gvwPL-r0bm2T01g',
  client_secret: 'EETM8zKkD4Jd5dtiDowpm7k3Fr6AzlJs_c4AbFlvqEFSL442A-VIgEIH6rTrE_HZhPeH-OwAlfcKEyy3'});*/

const logger = winston.createLogger({
  level: 'info',
  format : winston.format.combine(winston.format.timestamp({format: 'MM-DD HH:mm:ss'}), winston.format.printf(  info => `${info.timestamp} ${info.level}: ${info.message}`)),
  transports: [
    new winston.transports.File({ filename: 'logs/verifier.log' }),
    new winston.transports.Console(winston.format.colorize(), winston.format.simple())
  ]
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

MongoClient.connect(dbURL, {useNewUrlParser: true}, async function(dbError, client) {
  db = client.db("Database1");
  usersCollection = db.collection('users');
  accountsCollection = db.collection("instagram_accounts");

  logger.info("Subscription verification started");
  while (true) {
    await usersCollection.find().forEach(async function(user) {
      if (user.subscription_status == "trial") {
          var currentDate = new Date();
          var trialStartDate = new Date(user.trial_start_date);
          var timeDiff = currentDate.getTime() - trialStartDate.getTime();
          var trialDays = timeDiff / (1000 * 3600 * 24);
          if ( 5 - trialDays < 0) {
            logger.info("Updating account with expired trial - " + user._id);
            // Update their sub_status
            await usersCollection.updateOne({ _id : user._id }, {$set: {subscription_status : "expired-trial" }}, function(err, result) {
              if (err) { logger.error("Failed to update database after expired trial - " + user._id); }
            });

            // Turn off their Instagram account
            if (user.instagram_account_id) {
              await accountsCollection.updateOne({ _id : user.instagram_account_id}, { $set: { login_status: "none", mode : "off" }}, function(err, result) {
                if (err) { logger.error("Failed to turn off Instagram account after expired trial - " + user._id + ", " + user.instagram_account_id); }
              });
            }
          }
      } else if (user.paypal_agreement_id) {
        await paypal.billingAgreement.get(user.paypal_agreement_id, async function (error, billingAgreement) {
          if (error) {
            logger.error("Failed to get user's Paypal billing agreement - " + user._id + ", " + user.paypal_agreement_id);
          } else {
            if (billingAgreement.state != "Active") {
              logger.info("Updating account after user cancelled through Paypal - " + user._id + ", " + user.paypal_agreement_id);
              await usersCollection.updateOne({ _id : user._id }, {$set: {paypal_agreement_id : null, subscription_status : "cancelled" }}, function(err, result) {
                if (err) { logger.error("Failed to update database after user cancelled through Paypal - " + user._id + ", " + user.paypal_agreement_id); }
              });

              // Turn off their Instagram account
              if (user.instagram_account_id) {
                await accountsCollection.updateOne({ _id : user.instagram_account_id}, { $set: { login_status: "none", mode : "off" }}, function(err, result) {
                  if (err) { logger.error("Failed to turn off Instagram account after user cancelled through Paypal - " + user._id + ", " + user.paypal_agreement_id); }
                });
              }
            }
          }
        });
      }
    });
    await sleep(15000);
  }
});
