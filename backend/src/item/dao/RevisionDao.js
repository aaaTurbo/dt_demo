const PgPool = require("../../providers/db/PgPool");

class RevisionDao {
    async read(isolation) {
        return PgPool.withTransaction(async (client) => {
            const {rows} = await client.query(
                'SELECT value FROM state_revision WHERE id = 1')
            ;
            return Number(rows[0].value);
        }, isolation)

    }

    async bump() {
        return PgPool.withTransaction(async (client) => {
            const {rows} = await client.query(
                'UPDATE state_revision SET value = value + 1 WHERE id = 1 RETURNING value',
            );
            return Number(rows[0].value);
        })
    }
}

module.exports = new RevisionDao();