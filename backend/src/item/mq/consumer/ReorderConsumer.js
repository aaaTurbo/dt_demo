const Consumer = require("../../../providers/mq/Consumer");
const ReorderBuffer = require("../../buffer/ReorderBuffer");

module.exports = class ReorderConsumer extends Consumer {
    constructor(channel, buffer = ReorderBuffer, queue = process.env.RABBIT_REORDER_QUEUE) {
        super(channel, queue, buffer);
    }
}