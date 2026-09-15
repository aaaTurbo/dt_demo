const { Emitter } = require("@socket.io/redis-emitter");
const RedisPool = require("../../db/RedisPool");

class SockIOEmitter {

    #emitter = undefined;

    async init() {
        if (!this.#emitter)
            this.#emitter = new Emitter(await RedisPool.getClient())

        return this.#emitter;
    }

    emit(event, ...args) {
        this.#emitter
            .emit(event, ...args);
    }

}

module.exports = SockIOEmitter;