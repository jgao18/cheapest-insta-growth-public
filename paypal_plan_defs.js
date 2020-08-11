module.exports = {

// GENERIC BILLING PLANS USED AS A BASELINE TO CREATE BILLING AGREEMENTS WITH USERS

billingPlanAttributesBasic : {
   "name": "$5 Basic Monthly Subscription Plan",
   "description": "$5 Basic Monthly Subscription Plan",
   "type": "INFINITE",
   "payment_definitions": [
   {
     "name": "$5 Basic Monthly Subscription Payment Definition",
     "type": "REGULAR",
     "frequency": "MONTH",
     "frequency_interval": "1",
     "amount":
     {
       "value": "5.00",
       "currency": "USD"
     },
     "cycles": "0"
   }],
   "merchant_preferences":
   {
     "return_url": "http://localhost:3000/processPayment",
     "cancel_url": "http://localhost:3000/subscribe",
     "auto_bill_amount": "YES",
     "initial_fail_amount_action": "CANCEL",
     "max_fail_attempts": "1"
   }
},

billingAgreementAttributesBasic : {
   "name": "$5/month Cheapest Instagram Growth Subscription - Basic",
   "description": "$5 USD monthly subscription for a Basic Cheapest Instagram Growth subscription",
   "start_date": "2019-03-31T02:32:00Z", // CUSTOMIZE DATE
   "plan":
   {
     "id": "P-8EK438497S576953EZP2IFVY" // CUSTOMIZE P#
   },
   "payer":
   {
     "payment_method": "paypal"
   }
},

billingPlanAttributesFull : {
   "name": "$25 Monthly Subscription Plan",
   "description": "$25 Monthly Subscription Plan",
   "type": "INFINITE",
   "payment_definitions": [
   {
     "name": "$25 Monthly Subscription Payment Definition",
     "type": "REGULAR",
     "frequency": "MONTH",
     "frequency_interval": "1",
     "amount":
     {
       "value": "25.00",
       "currency": "USD"
     },
     "cycles": "0"
   }],
   "merchant_preferences":
   {
     "return_url": "http://localhost:3000/processPayment",
     "cancel_url": "http://localhost:3000/subscribe",
     "auto_bill_amount": "YES",
     "initial_fail_amount_action": "CANCEL",
     "max_fail_attempts": "1"
   }
},

billingAgreementAttributesFull : {
   "name": "$25/month Cheapest Instagram Growth Subscription - Full",
   "description": "$25 USD monthly subscription for a Full Cheapest Instagram Growth subscription",
   "start_date": "2019-03-31T02:32:00Z", // CUSTOMIZE DATE
   "plan":
   {
     "id": "P-8EK438497S576953EZP2IFVY" // CUSTOMIZE P#
   },
   "payer":
   {
     "payment_method": "paypal"
   }
}

}
