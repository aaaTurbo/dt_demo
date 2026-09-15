const Producer = require("../../../providers/mq/Producer");

module.exports = class ItemProducer extends Producer {

    constructor(channel, topic = process.env.RABBIT_EXCHANGE) {
        super(channel, topic);
    }

}