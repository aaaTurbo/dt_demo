const DeduplicatedBatchBuffer= require("../../common/buffer/DeduplicatedBatchBuffer");

const ItemService = require("../ItemService");
const WebSocketProvider = require("../../providers/ws/WebSocketProvider");

class AddBuffer extends DeduplicatedBatchBuffer {
    constructor(flusher, ms) {
        super(flusher, ms);
    }
}

module.exports = new AddBuffer(
    async (batch) => {
        if (batch.length === 0)
            return 0;

        const revision = await ItemService.flushAdd(batch);

        WebSocketProvider.emitter.emit(process.env.WS_ADD_EVENT, { ids: batch.map((b) => b.id), revision });

        return revision;
    },
    10_000
);