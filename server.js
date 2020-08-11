var MongoClient = require('mongodb').MongoClient;
var cookieParser = require('cookie-parser');
var session = require('express-session');
var ObjectId = require('mongodb').ObjectID;
var flash = require('connect-flash');
var paypal = require('paypal-rest-sdk');
var fetch = require("node-fetch");
var fs = require('fs');
var bcrypt = require('bcryptjs');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var Email = { send: function (a) { return new Promise(function (n, e) { a.nocache = Math.floor(1e6 * Math.random() + 1), a.Action = "Send"; var t = JSON.stringify(a); Email.ajaxPost("https://smtpjs.com/v3/smtpjs.aspx?", t, function (e) { n(e) }) }) }, ajaxPost: function (e, n, t) { var a = Email.createCORSRequest("POST", e); a.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), a.onload = function () { var e = a.responseText; null != t && t(e) }, a.send(n) }, ajax: function (e, n) { var t = Email.createCORSRequest("GET", e); t.onload = function () { var e = t.responseText; null != n && n(e) }, t.send() }, createCORSRequest: function (e, n) { var t = new XMLHttpRequest; return "withCredentials" in t ? t.open(e, n, !0) : "undefined" != typeof XDomainRequest ? (t = new XDomainRequest).open(e, n) : t = null, t } }; //require('./node_modules/smtpjs/smtp.js').Email;
var paypalPlanDefs = require('./paypal_plan_defs.js');
var winston = require('winston');

const dbURL = "" // hidden
var db;
var usersCollection;
var accountsCollection;

paypal.configure({
  mode: '',
  client_id: '',
  client_secret: ''}); // hidden


var billingPlanIdBasic = null;
var billingPlanIdFull = null;

const logger = winston.createLogger({
  level: 'info',
  format : winston.format.combine(winston.format.timestamp({format: 'MM-DD HH:mm:ss'}), winston.format.printf(  info => `${info.timestamp} ${info.level}: ${info.message}`)),
  transports: [
    new winston.transports.File({ filename: 'logs/server.log' }),
    new winston.transports.Console(winston.format.colorize(), winston.format.simple())
  ]
});

/*  EXPRESS SETUP  */

const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(express.static(__dirname + '/views/'));

/*  PASSPORT SETUP  */

const passport = require('passport');
app.use(session({secret: '', // hidden
                 saveUninitialized: true,
                 resave: true}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.serializeUser(function(user, cb) {
  cb(null, user._id);
});

passport.deserializeUser(async function(id, cb) {
  var user = await usersCollection.findOne( {_id : new ObjectId(id) });
  if (user) {
    cb(null, user);
  }
});

/* PASSPORT LOCAL AUTHENTICATION */

const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password'},
  async function(email, password, done) {
    var user = await usersCollection.findOne({ email: email.toLowerCase()});

    if (user && bcrypt.compareSync(password, user.password)) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  }
));

app.get('/', async function(req, res ) {
  var user = req.user;
  if (user) user.password = null;

  res.render('index', { user : user });
});

app.get('/register', ensureUnauthenticated, async function(req, res ) {
  res.render('register');
});

app.post('/registerAccount', ensureUnauthenticated, async function(req, res ) {
  var email = req.body.email.toLowerCase();
  var pw1 = req.body.password1;
  var pw2 = req.body.password2;

  // Registration validation
  if (!email || !pw1 || !pw2) //email.includes("@") || !email.includes(".")
  {
    res.render('register', { message: "Please provide a valid email and password!"});
  }
  else if (pw1 != pw2) {
    res.render('register', { message: "Passwords did not match!"});
  }
  else {
    var user = await usersCollection.findOne({email: email});
    // User account already exists
    if (user) {
      res.render('register', { message: "An account already exists with that e-mail!"});
    }
    // Make new CIG account
    else {
      // Make new CIG account, initially setting the Instagram account's document ID to null
      var currentDate = (new Date()).toISOString();
      var hashedPassword = bcrypt.hashSync(pw1, bcrypt.genSaltSync(10));
      usersCollection.insertOne({'email': email, 'password' : hashedPassword, 'instagram_account_id' : null, "subscription_status" : "trial", "trial_start_date" : currentDate, "paypal_agreement_id" : null}, function(err, result) {
        if (!err) {
          var user = result.ops[0];
          req.login(user, function(err) {
            if (!err) {
              return res.redirect('profile?welcome=yes');
            } else {
              res.render('register', { message: "Account was not created succesfully, please try again"});
            }
          });

          Email.send({
            Host : "smtp.gmail.com",
            Username : "cheapestinstagrowth@gmail.com",
            Password : "Flexmuffin91",
            To : 'gao.joey12@GMail.com',
            From : "cheapestinstagrowth@gmail.com",
            Subject : "This is the subject",
            Body : "And this is the body"
          }).then(
            //pass
          );

        }
      })
    }
  }
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/login', ensureUnauthenticated, async function(req, res) {
  var message = null;
  var err = req.flash().error;
  if (err)
  {
    if (err.length > 0) message = err[0];
  }
  res.render('login', { message : message});
});

app.post('/loginAccount', ensureUnauthenticated, passport.authenticate('local', { failureRedirect: '/login', failureFlash: "Invalid username or password" }),
  function(req, res) {
    res.redirect('profile');
  }
);

app.get('/profile', ensureAuthenticated, async function(req, res) {
  var user = req.user;
  if (user) user.password = null;

  var instagramAccountData = null;
  var loginStatus = getInstaLoginStatus("none", "off");

  if (user && user.instagram_account_id)
  {
    instagramAccountData = await accountsCollection.findOne( {_id : user.instagram_account_id });

    if (instagramAccountData.password) {
       instagramAccountData.password = "set";
    } else { instagramAccountData.password = "not set"; }

    loginStatus = getInstaLoginStatus(instagramAccountData.login_status, instagramAccountData.mode);
  }

  res.render('profile', { user: user , instagramAccountData: instagramAccountData, loginStatus: loginStatus[1], loginStatusColor: loginStatus[0], welcome : req.query.welcome });
});

app.post('/updateInstagramAccount', async function(req, res ) {
  var user = req.user;
  if (user) user.password = null;

  // Backend check for subscription
  if (user.subscription_status == "full" || user.subscription_status == "basic" || user.subscription_status == "trial" )
  {
    var username = req.body.username;
    var password = req.body.password;

    // Splice out initial hashtags if the user adds them
    var hashtags = [];
    for (var i = 0; i < req.body.hashtags.length; i++) {
      var hashtag = req.body.hashtags[i];
      if (hashtag[0] == "#") {
        hashtags.push(hashtag.slice(1));
      } else {
        hashtags.push(hashtag);
      }
    }

    // Backend check to ensure basic users don't have follow capabilities
    var mode = req.body.mode;
    if (mode == "follow" || mode == "unfollow") {
      if (user.subscription_status == "basic") {
        mode = "like";
      }
    }

    var message = null;
    var success = true;
    if (!username) {
      success = false;
      message = "Your Instagram username cannot be blank!"
    }
    else if (!user.instagram_account_id && !password) {
      // Fail on blank password for new accounts
      success = false;
      message = "Your Instagram password cannot be blank!"
    }
    else if (!hashtags || hashtags.length == 0) {
      success = false;
      message = "Your must follow at least one hashtag!"
    }

    if (success) {
      // Limit hashtags to first 5
      if (hashtags.length > 5) hashtags.length = 5;

      if (!user.instagram_account_id) {
        // Make a new Instagram account document for the user
        var hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
        var instagramAccount =  {"username" : username, "password" : hashedPassword, "login_status": "pending", "minrate" : 5, "maxrate" : 10, "mode" : mode,  'hashtags': hashtags };
        await accountsCollection.insertOne(instagramAccount, async function(err, insertedDocument) {
          if (!err) {
            var insertedDocumentData = insertedDocument.ops[0];

            // Update the CIG account document with the ID of the new created Instagram account document
            await usersCollection.updateOne( {_id : new ObjectId(user._id)}, { $set: {instagram_account_id: insertedDocumentData._id} } );

            // Hide password
            if (insertedDocumentData.password) {
               insertedDocumentData.password = "set";
            } else { insertedDocumentData.password = "not set"; }

            // Set status string
            var loginStatus = getInstaLoginStatus(insertedDocumentData.login_status, insertedDocumentData.mode);
            message = "Instagram account information set successfully!"
            res.render('partials/profile-insta-form', {user: user, instagramAccountData: insertedDocumentData, message : message, loginStatus: loginStatus[1], loginStatusColor: loginStatus[0] });
          } else { logger.error("Error creating new user's Instagram account document - " + user._id + " | " + err); }
        });
      } else {
        // Update existing Instagram account document
        var instagramAccountDataBefore = await accountsCollection.findOne( {_id : user.instagram_account_id });

        var setStruct = { mode: mode, hashtags: hashtags };
        if (username != instagramAccountDataBefore.username) {
          setStruct.username = username;
          setStruct.login_status = "pending"; // Temporarily set account status to pending for username/password changes until the Python backend updates
        }
        if (password && !bcrypt.compareSync(password, instagramAccountDataBefore.password)) {
          setStruct.password = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
          setStruct.login_status = "pending";
        }

        // Update database
        await accountsCollection.findOneAndUpdate({ _id : user.instagram_account_id }, { $set: setStruct }, { returnOriginal: false}, async function(err, updatedDocument) {
          if (!err) {
            var updatedDocumentData = updatedDocument.value;
            message = "Instagram account information updated successfully!"

            // Hide password
            if (updatedDocumentData.password) {
               updatedDocumentData.password = "set";
            } else { updatedDocumentData.password = "not set"; }

            // Set status string
            var loginStatus = getInstaLoginStatus(updatedDocumentData.login_status, updatedDocumentData.mode);

            res.render('partials/profile-insta-form', {user: user, instagramAccountData: updatedDocumentData, message : message, loginStatus: loginStatus[1], loginStatusColor: loginStatus[0] });
          } else { logger.error("Error updated user's Instagram account document - " + user._id + " | " + err); }
        });
      }
    } else {
      // User left something blank

      if (!user.instagram_account_id)
      {
        // No Instagram account set yet
        var instagramAccountData = null;
        loginStatus = getInstaLoginStatus("none", "off");
      }
      else {
        // Grab the current Instagram account data to reload the page with
        var instagramAccountData = await accountsCollection.findOne( {_id : user.instagram_account_id });

        // Hide password
        if (instagramAccountData.password) {
           instagramAccountData.password = "set";
        } else { instagramAccountData.password = "not set"; }

        loginStatus = getInstaLoginStatus(instagramAccountData.login_status, instagramAccountData.mode);
      }

      res.render('partials/profile-insta-form', {user: user, instagramAccountData: instagramAccountData, message : message, loginStatus: loginStatus[1], loginStatusColor: loginStatus[0] });
    }
  } else {
    res.redirect("profile");
  }
});

app.post('/updateInstagramAccountStatus', async function(req, res ) {
  var user = req.user;
  if (user) user.password = null;

  var loginStatus = getInstaLoginStatus("none", "off");
  if (user && user.instagram_account_id)
  {
    instagramAccountData = await accountsCollection.findOne( {_id : user.instagram_account_id });

    loginStatus = getInstaLoginStatus(instagramAccountData.login_status, instagramAccountData.mode);
  }

  res.render('partials/profile-insta-account-status', { loginStatus: loginStatus[1], loginStatusColor: loginStatus[0] });

});

app.get('/subscribe', ensureAuthenticated, async function(req, res ) {
  var user = req.user;
  if (user) user.password = null;

  res.render('subscribe', { user : user });
});

app.get('/subscribePaypalBasic', ensureAuthenticated, async function(req, res ) {
  // pass res for redirect by the function
  createBillingAgreement(req.user.email, billingPlanIdBasic, res);
});

app.get('/subscribePaypalFull', ensureAuthenticated, async function(req, res ) {
  // pass res for redirect by the function
  createBillingAgreement(req.user.email, billingPlanIdFull, res);
});

/// processPaymant return URL defined in paypal_plans.json
app.get('/processPayment', ensureAuthenticated, async function(req, res) {
  var user = req.user;
  if (user) user.password = null;

  // ASSUME IF PAYING AGAIN AND CURRENTLY SUBSCRIBED THAT THIS IS AN UPGRADE/DOWNGRADE
  var isUpgradeDowngrade = false;
  if (user.subscription_status == "basic" || user.subscription_status == "full") {
    isUpgradeDowngrade = true;
 }

  if (req.query.token) {
    executeBillingAgreement(req.query.token, user, isUpgradeDowngrade, res);
  }
});

app.get('/subscribed', ensureAuthenticated, async function(req, res ) {
  var user = req.user;
  if (user) user.password = null;

  if (user.subscription_status == "full" || user.subscription_status == "basic")
  {
    res.render("subscribed", { user : user, subscriptionStatus : user.subscription_status });
  } else {
    res.redirect("profile");
  }
});

app.get('/unsubscribePaypal', ensureAuthenticated, async function(req, res ) {
  cancelBillingAgreement(req.user, res);
});

app.get('/unsubscribed', ensureAuthenticated, async function(req, res ) {
  var user = req.user;
  if (user) user.password = null;

  if (user.subscription_status == "cancelled")
  {
    res.render("unsubscribed", { user : user });
  } else {
    res.redirect("profile");
  }
});

// Redirect anything we didn't handle to the home page
app.use(function(req, res) {
  res.redirect('profile')
});

function createBillingAgreement(email, planId, res) {
  var links = {};

  var agreementAttributes;
  if (planId == billingPlanIdFull) {
    agreementAttributes = JSON.parse(JSON.stringify(paypalPlanDefs.billingAgreementAttributesFull));
  } else {
    agreementAttributes = JSON.parse(JSON.stringify(paypalPlanDefs.billingAgreementAttributesBasic));
  }
  agreementAttributes.description += " for " + email;
  agreementAttributes.plan.id = planId;

  var startDate = new Date();
  startDate.setSeconds(startDate.getSeconds() + 60);
  startDate.toISOString().slice(9, 19) + 'Z';
  agreementAttributes.start_date = startDate;

  // Use activated billing plan to create agreement
  paypal.billingAgreement.create(agreementAttributes, function (error, billingAgreement) {
    if (error) {
     logger.error("Failed to create billing agreement for " + email + ", " + planId + " | " + JSON.stringify(error));
    } else {
      // Capture HATEOAS links
      billingAgreement.links.forEach(function(linkObj) {
        links[linkObj.rel] = { href: linkObj.href, method: linkObj.method };
      })

      // Redirects user to Paypal site to purcahse
      if (links.hasOwnProperty('approval_url')) {
        res.redirect(links['approval_url'].href);
      } else {
        logger.error('Billing plan has no redirect URL - ' + planId);
      }

      logger.info("Created billing agreement for " + email + " - " + planId);
      // Once the billing agreement is accepted, the billing plan defines return_url to POST /processPaymant
    }
  });
}

function executeBillingAgreement(token, user, isUpgradeDowngrade, res)
{
  // 1. Execute billing agreement
  paypal.billingAgreement.execute(token, {}, async function (error, billingAgreement) {
    if (error) {
      logger.error("Failed to execute billing agreement for " + user._id + ", " + token + " | " + JSON.stringify(error));
    } else {
      if (isUpgradeDowngrade) {
        logger.info("Executed billing agreement for upgrade/downgrade - " + user._id + ", " + billingAgreement.id);
        // 2. If upgrading or downgrading, cancel current plan
        if (user.paypal_agreement_id)
        {
          var cancelNote = {"note": "User switched to a different subscription on Cheapest Instagram Growth" };

          paypal.billingAgreement.cancel(user.paypal_agreement_id, cancelNote, async function (error, response) {
            if (error) {
              logger.error("Failed to cancel billing agreement for " + user._id + ", " + user.paypal_agreement_id + " | " + JSON.stringify(error));
              res.redirect("profile");
            } else {
              logger.info("Cancelled agreement for upgrade/downgrade - " + user._id + ", " + user.paypal_agreement_id);
              // 3. Update database with new plan
              if (billingAgreement.plan.payment_definitions[0].amount.value == "5.00") {
                await usersCollection.updateOne({ _id : user._id }, {$set: {paypal_agreement_id : billingAgreement.id, subscription_status : "basic" }}, async function (err, result) {
                  // If downgrading to basic, ensure their Instagram account mode is no longer on Follow/Unfollow mode
                  if (!err) {
                    if (user.instagram_account_id) {
                      await accountsCollection.findOne({ _id : user.instagram_account_id }, async function (err, result) {
                        if (!err) {
                          if (result.mode == "follow" || result.mode == "unfollow") {
                            await accountsCollection.findOneAndUpdate({ _id : user.instagram_account_id }, { $set: { mode : "like" } });
                          }
                        } else { logger.error("Failed to ensure valid account mode after downgrade " + user._id + ", " + user.instagram_account_id + " | " + JSON.stringify(err)); }
                      });
                    }
                  } else { logger.error("Failed to update database after downgrade " + user._id + ", " + billingAgreement.id + " | " + JSON.stringify(err)); }
                });
              }
              else if (billingAgreement.plan.payment_definitions[0].amount.value == "25.00") {
                await usersCollection.updateOne({ _id : user._id }, {$set: {paypal_agreement_id : billingAgreement.id, subscription_status : "full" }}, async function (err, result) {
                  if (err) { logger.error("Failed to update database after upgrade " + user._id + ", " + billingAgreement.id + " | " + JSON.stringify(err)); }
                });
              }
              else {
                logger.error("Invalid billing agreement plan payment definition for " + user._id + " - " + billingAgreement.id);
              }
              res.redirect("subscribed");
            }
          });
        }
      } else {  // 4. If not upgrade, ie. new subscription, just update database with new plan
        logger.info("Executed billing agreement for new subscription - " + user._id + ", " + billingAgreement.id);
        if (billingAgreement.plan.payment_definitions[0].amount.value == "5.00") {
          await usersCollection.updateOne({ _id : user._id }, {$set: {paypal_agreement_id : billingAgreement.id, subscription_status : "basic" }}, async function (err, result) {
            // If subscribing to basic, ensure their Instagram account mode is no longer on Follow/Unfollow mode
            if (!err) {
              if (user.instagram_account_id) {
                await accountsCollection.findOne({ _id : user.instagram_account_id }, async function (err, result) {
                  if (!err) {
                    if (result.mode == "follow" || result.mode == "unfollow") {
                      await accountsCollection.findOneAndUpdate({ _id : user.instagram_account_id }, { $set: { mode : "like" } });
                    }
                  } else { logger.error("Failed to ensure valid account mode after downgrade " + user._id + ", " + user.instagram_account_id + " | " + JSON.stringify(err)); }
                });
              }
            } else { logger.error("Failed to update database after new basic subscription " + user._id + ", " + billingAgreement.id + " | " + JSON.stringify(err)); }
          });
        }
        else if (billingAgreement.plan.payment_definitions[0].amount.value == "25.00") {
          await usersCollection.updateOne({ _id : user._id }, {$set: {paypal_agreement_id : billingAgreement.id, subscription_status : "full" }}, function (err, result) {
            if (err) { logger.error("Failed to update database after new full subscription " + user._id + ", " + billingAgreement.id + " | " + JSON.stringify(err)); }
          });
        }
        else {
          logger.error("Invalid billing agreement plan payment definition for " + user._id + " - " + billingAgreement.id);
        }
        res.redirect("subscribed");
       }
     }
   });
}

async function cancelBillingAgreement(user, res)
{
  if (user.paypal_agreement_id)
  {
    var cancelNote = {"note": "User requested subscription cancel from Cheapest Instagram Growth" };

    paypal.billingAgreement.cancel(user.paypal_agreement_id, cancelNote, async function (error, response) {
      if (error) {
        logger.error("Failed to cancel billing agreement after user cancelled from CIG website " + user._id + ", " + user.paypal_agreement_id + " | " + JSON.stringify(error));
        res.redirect("profile");
      } else {
        logger.info("User cancelled subscription from CIG website - " + user._id + ", " + user.paypal_agreement_id);
        await usersCollection.updateOne({ _id : user._id }, {$set: {paypal_agreement_id : null, subscription_status : "cancelled" }}, function (err, result) {
          if (err) { logger.error("Failed to update database after user cancelled subscription from CIG website " + user._id + ", " + user.paypal_agreement_id + " | " + JSON.stringify(err)); }
        });

        // Turn off their Instagram account
        if (user.instagram_account_id) {
          await accountsCollection.updateOne({ _id : user.instagram_account_id}, { $set: { login_status: "none", mode : "off" }}, function (err, result) {
            if (err) { logger.error("Failed to turn off user's Instagram account in database after user cancelled subscription from CIG website " + user._id + " | " + JSON.stringify(err)); }
          });
        }
        res.redirect("unsubscribed");
      }
    });
  }
}

function getInstaLoginStatus(statusString, mode) {
  var loginStatus;
  var loginStatusColor;
  switch (statusString) {
    case "none":
      loginStatus = "Set your Instagram credentials and Growth Mode to start!";
      loginStatusColor = "red";
      break;
    case "invalid":
      loginStatus = "Login failed - verify credentials";
      loginStatusColor = "red";
      break;
    case "pending":
      loginStatus = "Attempting to login...";
      loginStatusColor = "yellow";
      break;
    case "success":
      loginStatusColor = "green";
      if (mode == "follow") {
       loginStatus = "Logged in and running - Follow Mode";
      } else if (mode == "like") {
       loginStatus = "Logged in and running - Like Mode";
      } else if (mode == "unfollow") {
       loginStatus = "Logged in and running - Unfollow Mode";
      } else if (mode == "off") {
       loginStatusColor = "red";
       loginStatus = "Account is in Off Mode";
      }
      break;
    default:
      loginStatus = "Unkown Status - " + statusString;
      break;
  }
  return [loginStatusColor, loginStatus];
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('login')
  }
}

function ensureUnauthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  else {
    res.redirect('profile');
  }
}

MongoClient.connect(dbURL, {useNewUrlParser: true}, async function(dbError, client) {
  db = client.db("Database1");
  usersCollection = db.collection('users');
  accountsCollection = db.collection("instagram_accounts");

  // Grab the latest billing plan from the paypaln_plans.json file
  var billingPlansRaw = fs.readFileSync('paypal_plans.json');
  var billingPlansJson = JSON.parse(billingPlansRaw);
  billingPlanIdBasic = billingPlansJson.basic;
  billingPlanIdFull = billingPlansJson.full;

  logger.info("Acquired billing plans " + billingPlanIdBasic + " and " + billingPlanIdFull);

  const port = process.env.PORT || 3000;
  app.listen(port , () => logger.info('App listening on port ' + port))
});
