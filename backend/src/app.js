const PinoLogger = require("./providers/logger/PinoLogger");
const PgPool = require("./providers/db/PgPool");
const RedisPool = require("./providers/db/RedisPool");
const AddBuffer = require("./item/buffer/AddBuffer");
const SelectBuffer = require("./item/buffer/SelectBuffer");
const ReorderBuffer = require("./item/buffer/ReorderBuffer");

const AppModule = require("./AppModule");


async function bootstrap() {
    await AppModule.start();
    PinoLogger.logger.info(`Server started at ${process.env.SERVER_PORT}`);
}

const shutdown = async () => {
    PinoLogger.logger.info('Shutting down...');
    try {

        await Promise.all([
            AddBuffer.drain(),
            SelectBuffer.drain(),
            ReorderBuffer.drain(),
            PgPool.shutdownPool(),
        ]);

        RedisPool.shutDownPool();

        PinoLogger.logger.info('Stopped cleanly');

    } catch (err) {

        PinoLogger.logger.error({err}, 'Shutdown error');

    }
};

process.on("uncaughtException", (err) => {
    PinoLogger.logger.error(err, 'Uncaught exception');

    shutdown();
})

process.on("unhandledRejection", (reason, promise) => {
    PinoLogger.logger.error(reason, `Unhandled Promise Rejection`);

    shutdown();
})

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap();