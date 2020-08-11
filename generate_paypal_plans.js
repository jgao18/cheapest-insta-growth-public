var fs = require('fs');
var paypal = require('paypal-rest-sdk');
var paypalPlanDefs = require('./paypal_plan_defs.js');

var billingIdBasic = null;
var billingIdFull = null;


paypal.configure({
  mode: 'sandbox', // Sandbox or live
  client_id: 'AeJ4LS5Ll4C_1CV-5_VI1DNXtkdm-yjvz7ZT4rkm4z6AtNih-nkV39u7oHsjhzLidYdmc9ky124QGMwn',
  client_secret: 'ECDqy3JL_c2_7gf1lhN9qAH9nisuwK4PNgc9q0R12-QjIPyCc4W2reaJtgqnFGy4grYdpJtnWlh8qftj'});
/*
paypal.configure({
  mode: 'live',
  client_id: 'ARjtN9_oxjspEZRaVMNtPqMB2jjDN3VsRo3i46hkczw52uB0hXBtNtIeFMhCHPRZ2gvwPL-r0bm2T01g',
  client_secret: 'EETM8zKkD4Jd5dtiDowpm7k3Fr6AzlJs_c4AbFlvqEFSL442A-VIgEIH6rTrE_HZhPeH-OwAlfcKEyy3'});*/

function createBillingPlanBasic() {
   paypal.billingPlan.create(paypalPlanDefs.billingPlanAttributesBasic, function (error, billingPlan) {
     var billingPlanUpdateAttributes;

     if (error) {
       console.error(JSON.stringify(error));
       throw error;
     } else {
       // Create billing plan patch object
       billingPlanUpdateAttributes = [{
         op: 'replace',
         path: '/',
         value: {
           state: 'ACTIVE'
         }
       }];

       // Activate the plan by changing status to active
       paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function(error, response){
         if (error){
           console.error(JSON.stringify(error));
           throw error;
         } else {
           billingIdBasic = billingPlan.id
           console.log('Basic billing plan created under ID: ' + billingPlan.id);
         }
       });
     }
   });
}

function createBillingPlanFull() {
   paypal.billingPlan.create(paypalPlanDefs.billingPlanAttributesFull, function (error, billingPlan) {
     var billingPlanUpdateAttributes;

     if (error) {
       console.error(JSON.stringify(error));
       throw error;
     } else {
       // Create billing plan patch object
       billingPlanUpdateAttributes = [{
         op: 'replace',
         path: '/',
         value: {
           state: 'ACTIVE'
         }
       }];

       // Activate the plan by changing status to active
       paypal.billingPlan.update(billingPlan.id, billingPlanUpdateAttributes, function(error, response){
         if (error){
           console.error(JSON.stringify(error));
           throw error;
         } else {
           billingIdFull = billingPlan.id
           console.log('Full billing plan created under ID: ' + billingPlan.id);
         }
       });
     }
   });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  createBillingPlanBasic();
  createBillingPlanFull();

  await sleep(10000);

  var jsonData = {
      basic: billingIdBasic,
      full: billingIdFull
  };

  fs.writeFileSync('paypal_plans.json', JSON.stringify(jsonData));
}

main();
