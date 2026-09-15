const {Server} = require("socket.io")
const {createAdapter} = require("@socket.io/redis-adapter");

const RedisPool = require("../../db/RedisPool");
const PinoLogger = require("../../logger/PinoLogger");

const FILTERS_EVENT = 'items:filters';
const FILTERS_GET_EVENT = 'items:filters:get';
const FILTERS_KEY = 'items:filters';

function normalizeSearch(value) {
    if (value == null) return '';
    return String(value).replace(/\D/g, '').slice(0, 9);
}

function normalizeFilters(payload) {
    return {
        left: normalizeSearch(payload?.left ?? payload?.search),
        right: normalizeSearch(payload?.right ?? payload?.search),
    };
}

class SockIOServer {

    #httpServer;
    #io;
    #pub;
    #filters = { left: '', right: '' };

    constructor(server) {
        this.#httpServer = server;
    }

    async run() {
        const {pub, sub} = await RedisPool.getPubSub();
        this.#pub = await RedisPool.getClient();

        try {
            const saved = await this.#pub.get(FILTERS_KEY);
            if (saved) this.#filters = normalizeFilters(JSON.parse(saved));
        } catch (err) {
            PinoLogger.logger.error({err}, 'Failed to load filters');
        }

        this.#io = new Server(this.#httpServer, {
            path: '/ws/',
            cors: {origin: true, methods: ['GET', 'POST']},
            adapter: createAdapter(pub, sub),
        });

        this.#io.on('connection', (socket) => {
            PinoLogger.logger.info(`WS: ${socket.id}`);
            socket.emit(FILTERS_EVENT, this.#filters);

            socket.on(FILTERS_GET_EVENT, () => {
                socket.emit(FILTERS_EVENT, this.#filters);
            });

            socket.on(FILTERS_EVENT, (payload) => {
                void this.#applyFilters(payload);
            });
        });

        PinoLogger.logger.info(`WS Server listening!`);
        return this.#io;
    }

    async #applyFilters(payload) {
        const next = normalizeFilters(payload);
        if (this.#filters.left === next.left && this.#filters.right === next.right) {
            return;
        }

        this.#filters = next;
        try {
            await this.#pub.set(FILTERS_KEY, JSON.stringify(this.#filters));
        } catch (err) {
            PinoLogger.logger.error({err}, 'Failed to persist filters');
        }
        this.#io.emit(FILTERS_EVENT, this.#filters);
    }

    get io() {
        return this.#io;
    }
}

module.exports = SockIOServer;
