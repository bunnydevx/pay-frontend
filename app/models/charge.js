'use strict'

// NPM dependencies
const logger = require('winston')

// Local dependencies
const connectorClient = require('../services/clients/connector_client')
const State = require('../../config/state.js')
const StateModel = require('../../config/state')

// Constants
const CANCELABLE_STATES = [
  StateModel.CREATED,
  StateModel.ENTERING_CARD_DETAILS,
  StateModel.AUTH_SUCCESS,
  StateModel.AUTH_READY,
  StateModel.AUTH_3DS_REQUIRED,
  StateModel.AUTH_3DS_READY
]

module.exports = correlationId => {
  correlationId = correlationId || ''

  const updateToEnterDetails = function (chargeId) {
    return updateStatus(chargeId, State.ENTERING_CARD_DETAILS)
  }

  const updateStatus = function (chargeId, status) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).updateStatus({ chargeId, payload: { new_status: status } })
        .then(response => {
          updateComplete(response, { resolve, reject })
        })
        .catch(err => {
          clientUnavailable(err, { resolve, reject })
        })
    })
  }

  const find = function (chargeId) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).findCharge({ chargeId })
        .then(response => {
          if (response.statusCode !== 200) {
            return reject(new Error('GET_FAILED'))
          }
          resolve(response.body)
        })
        .catch(err => {
          clientUnavailable(err, { resolve, reject })
        })
    })
  }

  const capture = function (chargeId) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).capture({ chargeId })
        .then(response => {
          captureComplete(response, { resolve, reject })
        })
        .catch(err => {
          captureFail(err, { resolve, reject })
        })
    })
  }

  const cancel = function (chargeId) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).cancel({ chargeId })
        .then(response => {
          cancelComplete(response, { resolve, reject })
        })
        .catch(err => {
          cancelFail(err, { resolve, reject })
        })
    })
  }

  const findByToken = function (tokenId) {
    return new Promise(function (resolve, reject) {
      connectorClient({ correlationId }).findByToken({ tokenId })
        .then(response => {
          if (response.statusCode !== 200) {
            return reject(new Error('GET_FAILED'))
          }
          resolve(response.body)
        })
        .catch(err => {
          clientUnavailable(err, { resolve, reject })
        })
    })
  }

  const patch = function (chargeId, op, path, value, subSegment) {
    return new Promise(function (resolve, reject) {
      const payload = {
        op: op,
        path: path,
        value: value
      }
      connectorClient({ correlationId }).patch({ chargeId, payload }, subSegment)
        .then(response => {
          const code = response.statusCode
          if (code === 200) {
            resolve()
          } else {
            reject(new Error('Calling connector to patch a charge returned an unexpected status code'))
          }
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  const cancelComplete = function (response, defer) {
    const code = response.statusCode
    if (code === 204) return defer.resolve()
    logger.error('[%s] Calling connector cancel a charge failed -', correlationId, {
      service: 'connector',
      method: 'POST',
      status: code
    })
    if (code === 400) return defer.reject(new Error('CANCEL_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  const cancelFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  const captureComplete = function (response, defer) {
    const code = response.statusCode
    if (code === 204) return defer.resolve()
    if (code === 400) return defer.reject(new Error('CAPTURE_FAILED'))
    return defer.reject(new Error('POST_FAILED'))
  }

  const captureFail = function (err, defer) {
    clientUnavailable(err, defer)
  }

  const updateComplete = function (response, defer) {
    if (response.statusCode !== 204) {
      logger.error('[%s] Calling connector to update charge status failed -', correlationId, {
        chargeId: response.body,
        status: response.statusCode
      })
      defer.reject(new Error('UPDATE_FAILED'))
      return
    }
    defer.resolve({ success: 'OK' })
  }

  const isCancellableCharge = chargeStatus => {
    return CANCELABLE_STATES.includes(chargeStatus)
  }

  const clientUnavailable = function (error, defer) {
    defer.reject(new Error('CLIENT_UNAVAILABLE'), error)
  }

  return {
    updateStatus,
    updateToEnterDetails,
    find,
    capture,
    findByToken,
    cancel,
    patch,
    isCancellableCharge
  }
}
