const pino = require('pino');

class PinoLogger {

    #logger = pino({
        level: process.env.LOG_LEVEL,
        transport: process.env.NODE_ENV !== 'production'
            ? {target: 'pino-pretty', options: {colorize: true}}
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        serializers: {
            req: pino.stdSerializers.req,
            res: pino.stdSerializers.res,
            err: pino.stdSerializers.err,
        },
    });

    get logger() {
        return this.#logger;
    }
}

module.exports = new PinoLogger();