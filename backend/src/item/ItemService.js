const ItemDao = require('./dao/ItemDao');
const RevisionDao = require('./dao/RevisionDao');
const ItemProducer = require('./mq/producer/ItemProducer');
const RabbitProvider = require('../providers/mq/RabbitProvider');

const ConflictError = require("./error/ConflictError");

class ItemService {
    #itemDao = ItemDao;
    #revisionDao = RevisionDao;

    get #publisher() {
        return RabbitProvider.get(ItemProducer.name);
    }

    async createItem(dto) {

        if (await this.#itemDao.existsById(dto.id))
            throw new ConflictError(`item ${dto.id} already exists`);

        await this.#publisher.publish(process.env.RABBIT_ADD_QUEUE, dto);

        return {accepted: true, id: dto.id};
    }

    async selectItem(dto) {
        await this.#publisher.publish(process.env.RABBIT_SELECT_QUEUE, dto);

        return {accepted: true, id: dto.id, isSelected: dto.isSelected};
    }

    async reorderItem(dto) {
        await this.#publisher.publish(process.env.RABBIT_REORDER_QUEUE, dto);

        return {accepted: true, id: dto.id, sortWeight: dto.sortWeight};
    }

    async listItems(dto) {
        const {items, nextCursor} = await this.#itemDao.fetchUnselected(dto.limit, dto.direction, dto.search, dto.cursor);

        const revision = await this.#revisionDao.read();

        return {items, nextCursor, revision};
    }

    async listSelected(dto) {
        const {items, nextCursor} = await this.#itemDao.fetchSelected(dto.limit, dto.direction, dto.search, dto.cursor);

        const revision = await this.#revisionDao.read();

        return {items, nextCursor, revision};
    }

    async getState(dto) {
        const left = await this.#itemDao.fetchUnselected(dto.limit, dto.direction, dto.search, dto.cursor, 'REPEATABLE READ');
        const right = await this.#itemDao.fetchSelected(dto.limit, dto.direction, dto.search, dto.cursor, 'REPEATABLE READ');
        const revision = await this.#revisionDao.read('REPEATABLE READ');

        return {
            left: {items: left.items, nextCursor: left.nextCursor},
            right: {items: right.items, nextCursor: right.nextCursor},
            revision,
        };
    }

    async flushAdd(batch) {
        const ids = batch.map((d) => d.id);
        await this.#itemDao.insertBatch(ids);
        return this.#revisionDao.bump();
    }

    async flushSelect(batch) {
        const toSelect = batch.filter((d) => d.isSelected).map((d) => d.id);
        const toDeselect = batch.filter((d) => !d.isSelected).map((d) => d.id);
        const { selectedWithWeights } = await this.#itemDao.updateSelectionBatch(toSelect, toDeselect);
        const revision = await this.#revisionDao.bump();
        return {revision, selected: selectedWithWeights, deselected: toDeselect};
    }

    async flushReorder(batch) {
        const ids = batch.map((d) => d.id);
        const weights = batch.map((d) => d.sortWeight);
        await this.#itemDao.updateWeightsBatch(ids, weights);
        return this.#revisionDao.bump();
    }
}

module.exports = new ItemService();