const Redis = require("redis")

class RedisPool {

    #pub = Redis.createClient({url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`});
    #sub = this.#pub.duplicate();


    async getClient() {
        return Redis
            .createClient({url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`})
            .connect();
    }

    async getPubSub() {
        await Promise.all([
            this.#pub.connect(),
            this.#sub.connect()
        ])

        return {
            pub: this.#pub,
            sub: this.#sub
        }
    }

    shutDownPool() {
        this.#pub.destroy();
        this.#sub.destroy()
    }

}

module.exports = new RedisPool();