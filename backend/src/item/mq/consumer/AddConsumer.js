const Consumer = require("../../../providers/mq/Consumer");
const AddBuffer = require("../../buffer/AddBuffer");

module.exports = class AddConsumer extends Consumer {
    constructor(channel, buffer = AddBuffer, queue = process.env.RABBIT_ADD_QUEUE) {
        super(channel, queue, buffer);
    }
}