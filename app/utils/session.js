module.exports = function() {
  'use strict';

  var createChargeIdSessionKey = function(chargeId) {
    return 'ch_' + chargeId;
  },

  retrieve = function(req, chargeId) {
    return req.frontend_state[createChargeIdSessionKey(chargeId)];
  },

  store = function(chargeSession, hashCardNumber, expiryDate, cardholderName, address) {
    chargeSession.cardNumber = hashCardNumber;
    chargeSession.expiryDate = expiryDate;
    chargeSession.cardholderName = cardholderName;
    chargeSession.address = address;
  };

  return {
    retrieve: retrieve,
    createChargeIdSessionKey: createChargeIdSessionKey,
    store: store
  };
}();
