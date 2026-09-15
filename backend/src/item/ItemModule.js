const Initiable = require("../common/interface/Initiable");

const RabbitProvider = require('../providers/mq/RabbitProvider');
const ItemController = require('./ItemController');
const ItemProducer = require('./mq/producer/ItemProducer');
const AddConsumer = require('./mq/consumer/AddConsumer');
const SelectConsumer = require('./mq/consumer/SelectConsumer');
const ReorderConsumer = require('./mq/consumer/ReorderConsumer');

class ItemModule extends Initiable {

    #export = {
        mapping: "/item",
        controller: ItemController
    };

    async init() {
        await RabbitProvider.init();
        await RabbitProvider.register(
            ItemProducer,
            AddConsumer,
            SelectConsumer,
            ReorderConsumer
        );
        await RabbitProvider.run();
    }

    get export() {
        return this.#export;
    }

}

module.exports = new ItemModule();