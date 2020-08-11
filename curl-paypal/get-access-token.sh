curl -v https://api.sandbox.paypal.com/v1/oauth2/token \
   -H "Accept: application/json" \
   -H "Accept-Language: en_US" \
   -u "AeJ4LS5Ll4C_1CV-5_VI1DNXtkdm-yjvz7ZT4rkm4z6AtNih-nkV39u7oHsjhzLidYdmc9ky124QGMwn:ECDqy3JL_c2_7gf1lhN9qAH9nisuwK4PNgc9q0R12-QjIPyCc4W2reaJtgqnFGy4grYdpJtnWlh8qftj" \
   -d "grant_type=client_credentials" > access-token.txt