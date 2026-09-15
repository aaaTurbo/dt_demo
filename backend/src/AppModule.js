const express = require("express");
const pino = require("pino-http");

const {createServer} = require("http");
const WebSocketProvider = require("./providers/ws/WebSocketProvider");
const Initiable = require("./common/interface/Initiable");
const ValidationError = require("./item/error/ValidationError");
const ConflictError = require("./item/error/ConflictError");

class AppModule {

    #app = express()
    #router = express.Router()

    constructor() {
        this.#app.use(pino());
    }

    async start() {
        this.#router
            .use(express.json())
            .use('/', require("./AppController"));

        await this.#use(
            require("./item/ItemModule")
        )

        this.#app.use('/api/v1', this.#router);

        this.#app.use((err,req, res, next) => {

            req.log.error(err);

            if (err instanceof ValidationError)
                return res
                    .status(400)
                    .json({ error: err.message, field: err.field });

            if (err instanceof ConflictError)
                return res
                    .status(409)
                    .json({ error: err.message });

            res
                .status(err.status || 500)
                .json({ error: 'internal error' });
        });

        const server = createServer(this.#app);
        await WebSocketProvider.listen(server)

        server.listen(process.env.SERVER_PORT)
    }

    async #use(...mods) {
        await Promise.all(mods.map(async (mod) => {
            if (mod instanceof Initiable)
                await mod.init();

            if (mod.export.controller)
                this.#addRoute(mod.export.mapping, mod.export.controller);
        }));

        return this;
    }

    #addRoute(mapping, controller) {
        this.#router.use(mapping, controller);
    }

}

module.exports = new AppModule();