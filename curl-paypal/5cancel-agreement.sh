curl -v -X POST https://api.sandbox.paypal.com/v1/payments/billing-agreements/I-6UK94M0VKH1U/cancel \
-H "Content-Type: application/json" \
-H "Authorization: Bearer A21AAE0j914hl4YAmCInQFvI7Yt40ksUkLaLlwXuWdgTUs23DoALXXTskpG5l1pGO8g_KP56qy8UyfEBLZ7lNmDAzi9i8CXhQ" \
-d '{
  "note": "Canceling Cheapest Insta Growth subscription"
}'