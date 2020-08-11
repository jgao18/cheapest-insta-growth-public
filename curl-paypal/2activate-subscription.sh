curl -v -X PATCH https://api.sandbox.paypal.com/v1/payments/billing-plans/P-8EK438497S576953EZP2IFVY/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer A21AAE0j914hl4YAmCInQFvI7Yt40ksUkLaLlwXuWdgTUs23DoALXXTskpG5l1pGO8g_KP56qy8UyfEBLZ7lNmDAzi9i8CXhQ" \
  -d '[{
  "op": "replace",
  "path": "/",
  "value":
  {
    "state": "ACTIVE"
  }
}]'