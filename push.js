// push.js

var Parse = require('parse/node').Parse,
    PromiseRouter = require('./PromiseRouter'),
    rest = require('./rest'),
    moment = require('moment');

var validPushTypes = ['ios', 'android'];

function handlePush(req) {
  validateMasterKey(req);
  var where = getQueryCondition(req);
  validateDeviceType(where);
  req.expirationTime = getExpirationTime(req);
  return rest.find(req.config, req.auth, '_Installation', where).then(function(response) {
    throw new Parse.Error(Parse.Error.COMMAND_UNAVAILABLE,
                  'This path is not implemented yet.');
  });
}

/**
 * Check whether the deviceType parameter in qury condition is valid or not.
 * @param {Object} where A query condition
 */
function validateDeviceType(where) {
  var where = where || {};
  var deviceTypeField = where.deviceType || {};
  var deviceTypes = [];
  if (typeof deviceTypeField === 'string') {
    deviceTypes.push(deviceTypeField);
  } else if (typeof deviceTypeField['$in'] === 'array') {
    deviceTypes.concat(deviceTypeField['$in']);
  }
  for (var i = 0; i < deviceTypes.length; i++) {
    var deviceType = deviceTypes[i];
    if (validPushTypes.indexOf(deviceType) < 0) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                            deviceType + ' is not supported push type.');
    }
  }
}

/**
 * Get expiration time from the request body.
 * @param {Object} request A request object
 * @returns {Number|undefined} The expiration time if it exists in the request
 */
function getExpirationTime(req) {
  var body = req.body || {};
  var hasExpirationTime = !!body['expiration_time'];
  if (!hasExpirationTime) {
    return;
  }
  expirationTime = moment(body['expiration_time']);
  if (!expirationTime.isValid()) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          body['expiration_time'] + ' is not valid time.');
  }
  return expirationTime.valueOf();
}

/**
 * Get query condition from the request body.
 * @param {Object} request A request object
 * @returns {Object} The query condition, the where field in a query api call
 */
function getQueryCondition(req) {
  var body = req.body || {};
  var hasWhere = typeof body.where !== 'undefined';
  var hasChannels = typeof body.channels !== 'undefined';

  var where;
  if (hasWhere && hasChannels) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'Channels and query can not be set at the same time.');
  } else if (hasWhere) {
    where = body.where;
  } else if (hasChannels) {
    where = {
      "channels": {
        "$in": body.channels
      }
    }
  } else {
    where = {};
  }
  return where;
}

/**
 * Check whether the api call has master key or not.
 * @param {Object} request A request object
 */
function validateMasterKey(req) {
  if (req.info.masterKey !== req.config.masterKey) {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'Master key is invalid, you should only use master key to send push');
  }
}

var router = new PromiseRouter();
router.route('POST','/push', handlePush);

module.exports = {
  router: router
}

if (typeof process !== 'undefined' && process.env.TESTING === 1) {
  module.exports.getQueryCondition = getQueryCondition;
  module.exports.validateMasterKey = validateMasterKey;
  module.exports.getExpirationTime = getExpirationTime;
  module.exports.validateDeviceType = validateDeviceType;
}
