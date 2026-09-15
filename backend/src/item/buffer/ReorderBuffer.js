const DeduplicatedBatchQueue = require("../../common/buffer/DeduplicatedBatchBuffer");

const ItemService = require("../ItemService");
const WebSocketProvider = require("../../providers/ws/WebSocketProvider");

class ReorderBuffer extends DeduplicatedBatchQueue {
    constructor(flusher, ms) {
        super(flusher, ms);
    }
}

module.exports = new ReorderBuffer(
    async (batch) => {
        if (batch.length === 0)
            return 0;

        const revision = await ItemService.flushReorder(batch);

        WebSocketProvider.emitter.emit(process.env.WS_REORDER_EVENT, { items: batch.map(b => ({ id: b.id, sortWeight: b.sortWeight })), revision });

        return revision;
    },
    1_000
);