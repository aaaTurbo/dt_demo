const DeduplicatedBatchQueue = require("../../common/buffer/DeduplicatedBatchBuffer");

const ItemService = require("../ItemService");
const WebSocketProvider = require("../../providers/ws/WebSocketProvider");

class SelectBuffer extends DeduplicatedBatchQueue {
    constructor(flusher, ms) {
        super(flusher, ms);
    }
}

module.exports = new SelectBuffer(
    async (batch) => {
        if (batch.length === 0)
            return 0;

        const { revision, selected, deselected } = await ItemService.flushSelect(batch);

        WebSocketProvider.emitter.emit(process.env.WS_SELECT_EVENT, { selected, deselected, revision });

        return revision;
    },
    1_000
);