const {Pool} = require('pg');
const PinoLogger = require('../logger/PinoLogger');

class PgPool {

    #pool = new Pool({
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        keepalive: true
    });

    #isolationWhiteList = new Set(['READ COMMITTED', 'REPEATABLE READ', 'SERIALIZABLE']);

    async withTransaction( fn = async (client) => {}, isolation ) {
        const client = await this.#pool.connect();

        if (isolation  && this.#isolationWhiteList.has(isolation))
            await client.query(`SET TRANSACTION ISOLATION LEVEL ${isolation}`);

        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');

        client.release();

        return result;
    }

    async shutdownPool() {
        await this.#pool.end();

        PinoLogger.logger.info('Pg pool closed!');
    }

}

module.exports = new PgPool();