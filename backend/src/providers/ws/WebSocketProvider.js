const SockIOServer = require('./sockio/SockIOServer');

class WebSocketServer {

    #server;
    #io;

    async listen(server) {
        this.#server = new SockIOServer(server);
        this.#io = await this.#server.run();
    }

    get emitter() {
        return {
            emit: (event, ...args) => {
                this.#io?.emit(event, ...args);
            },
        };
    }

}

module.exports = new WebSocketServer();
