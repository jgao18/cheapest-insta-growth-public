curl -v -X POST https://api.sandbox.paypal.com/v1/payments/billing-agreements/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer A21AAE0j914hl4YAmCInQFvI7Yt40ksUkLaLlwXuWdgTUs23DoALXXTskpG5l1pGO8g_KP56qy8UyfEBLZ7lNmDAzi9i8CXhQ" \
  -d '{
  "name": "Cheapest Insta Growth Subscription",
  "description": "$4.99 monthly payment for a Cheapest Insta Growth subscription",
  "start_date": "2019-03-31T02:32:00Z",
  "plan":
  {
    "id": "P-8EK438497S576953EZP2IFVY"
  },
  "payer":
  {
    "payment_method": "paypal"
  }
}' > agreement.txt