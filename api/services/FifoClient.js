/**
 * This is mainly create the message packat assign the id to messages
 */
'use strict';
const FifoClient = require('bitinvo-fifo').FifoClient;

module.exports = {
  sendFifoMessage: FifoClient.sendFifoMessage,
  destroy: FifoClient.destroy
};
