const Consumer = require("../../../providers/mq/Consumer");
const SelectBuffer = require("../../buffer/SelectBuffer");

module.exports = class SelectConsumer extends Consumer {
    constructor(channel, buffer = SelectBuffer, queue = process.env.RABBIT_SELECT_QUEUE) {
        super(channel, queue, buffer);
    }
}