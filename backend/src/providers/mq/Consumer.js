const PinoLogger = require("../logger/PinoLogger");
const Runnable = require("../../common/interface/Runnable");

module.exports = class Consumer extends Runnable {

    #queue;
    #channel;
    #buffer;

    constructor(channel, queue, buffer) {
        super();
        this.#queue = queue;
        this.#channel = channel;
        this.#buffer = buffer;
    }

    async run() {
        await this.#channel.assertQueue(this.#queue, { durable: true });
        await this.#channel.bindQueue(this.#queue, process.env.RABBIT_EXCHANGE, this.#queue);
        await this.#channel.prefetch(Number.parseInt(process.env.RABBIT_PREFETCH));

        this.#channel.consume(this.#queue, (msg) => {

            if (!msg)
                return;

            try {

                const data = JSON.parse(msg.content.toString());

                const ackable = {
                    ack: () => this.#channel.ack(msg),
                    nack: () => this.#channel.nack(msg, false, false),
                };

                this.#buffer.enqueue(String(data.id), data, ackable);

            } catch (err) {

                PinoLogger.logger.error({ err, queue: this.#queue }, 'malformed message, sending to DLQ');
                this.#channel.nack(msg, false, false);

            }
        });

        PinoLogger.logger.info(`${this.constructor.name}: Consumer started!`);
    }

}