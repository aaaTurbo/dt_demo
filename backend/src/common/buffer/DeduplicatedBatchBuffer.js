const PinoLogger = require('../../providers/logger/PinoLogger')

module.exports = class DeduplicatedBatchBuffer {

    #pending = new Map();
    #flushing = false;
    #intervalMs;
    #flusher;
    #flushTimer;

    constructor(
        flusher = new Promise(),
        intervalMs
    ) {

        this.#flusher = flusher;
        this.#intervalMs = intervalMs;
        this.#flushTimer = setInterval(
            () => this.#flush().catch((error) => PinoLogger.logger.error({err: error}, 'Flush error:')),
            this.#intervalMs);

    }

    enqueue(key = '', data, msg) {
        const existing = this.#pending.get(key);
        if (existing) {
            existing.data = data;
            existing.msgs.push(msg);
        } else {
            this.#pending.set(key, { data, msgs: [msg] });
        }
    }

    async #flush() {

        if (this.#flushing || this.#pending.size === 0)
            return;

        this.#flushing = true;

        const entries = Array.from(this.#pending.values());
        this.#pending.clear();

        const batch = entries.map((e) => e.data);
        const allMsgs = entries.flatMap((e) => e.msgs);

        try {

            const revision = await this.#flusher(batch);
            allMsgs.forEach((msg) => msg.ack());
            PinoLogger.logger.debug(
                'Batch flushed:',
                {size: batch.length, msgs: allMsgs.length, revision }
            );

        } catch (error) {

            allMsgs.forEach((msg) => msg.nack());
            PinoLogger.logger.error({error}, 'Flush requeue:');

        } finally {

            this.#flushing = false;

        }

    }

    async drain() {

        if (this.#flushTimer)
            clearInterval(this.#flushTimer);

        await this.#flush();

    }

}