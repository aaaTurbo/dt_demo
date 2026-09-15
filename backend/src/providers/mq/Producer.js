const PinoLogger = require("../logger/PinoLogger");
const Initiable = require("../../common/interface/Initiable");

module.exports = class Producer extends Initiable {

    #channel;

    constructor(channel) {
        super();
        this.#channel = channel;
    }

    async init(topic) {
        await this.#channel.assertExchange(process.env.RABBIT_EXCHANGE, 'direct', {durable: true});
        PinoLogger.logger.info(`${this.constructor.name}: Producer ready!`);
    }

    publish(queue, msg) {
        this.#channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));
    }

}