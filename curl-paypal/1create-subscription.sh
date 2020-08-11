curl -v -X POST https://api.sandbox.paypal.com/v1/payments/billing-plans/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer A21AAE0j914hl4YAmCInQFvI7Yt40ksUkLaLlwXuWdgTUs23DoALXXTskpG5l1pGO8g_KP56qy8UyfEBLZ7lNmDAzi9i8CXhQ" \
  -d '{
  "name": "4.99 Monthly Subscription Plan",
  "description": "4.99 Monthly Subscription Plan",
  "type": "fixed",
  "payment_definitions": [
  {
    "name": "4.99 Monthly Subscription Payment Definition",
    "type": "REGULAR",
    "frequency": "MONTH",
    "frequency_interval": "1",
    "amount":
    {
      "value": "4.99",
      "currency": "USD"
    },
    "cycles": "0"
  }],
  "merchant_preferences":
  {
    "return_url": "https://example.com/return",
    "cancel_url": "https://example.com/cancel",
    "auto_bill_amount": "YES",
    "initial_fail_amount_action": "CONTINUE",
    "max_fail_attempts": "0"
  }
}' > subscription.txt