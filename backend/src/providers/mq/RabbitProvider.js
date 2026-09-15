const PinoLogger = require('../logger/PinoLogger');
const Consumer = require("./Consumer");
const Producer = require("./Producer");
const Runnable = require("../../common/interface/Runnable");
const Initiable = require("../../common/interface/Initiable");
const ampq = require("amqplib");

class RabbitProvider extends Initiable {

    #initialized = new Map();
    #connection;

    async init() {
        this.#connection = await ampq.connect(process.env.RABBIT_URL)
    }

    async register(...components) {
        return Promise.all(components.map(async component => {
            if (Consumer.isPrototypeOf(component) ||Producer.isPrototypeOf(component))
                this.#initialized.set(component.name, new component(await this.#connection.createChannel()));
            else
                PinoLogger.logger.error(`Cannot register Rabbit component: ${component.name}`);
        }))
    }

    async run() {
        await Promise.all(Array.from(this.#initialized.values()).map((component) => {
            if (component instanceof Runnable) {
                return component.run();
            }

            if (component instanceof Initiable) {
                return component.init();
            }

        }))
    }

    get(classname) {
        return this.#initialized.get(classname);
    }

}

module.exports = new RabbitProvider();