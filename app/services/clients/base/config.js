'use strict'

const requestLogger = require('./request-logger')
const { getRequestCorrelationIDField } = require('./request-context')
const { CORRELATION_HEADER } = require('../../../../config/correlation-header')

function transformRequestAddHeaders () {
  const correlationId = getRequestCorrelationIDField()
  const headers = {}
  if (correlationId) {
    headers[CORRELATION_HEADER] = correlationId
  }
  return headers
}

function onRequestStart (context) {
  requestLogger.logRequestStart(context)
}

function onSuccessResponse (context) {
  requestLogger.logRequestEnd(context)
}

function onFailureResponse (context) {
  requestLogger.logRequestEnd(context)
  requestLogger.logRequestFailure(context)
}

function configureClient (client, baseUrl) {
  client.configure(baseUrl, {
    transformRequestAddHeaders,
    onRequestStart,
    onSuccessResponse,
    onFailureResponse
  })
}

module.exports = {
  configureClient
}
