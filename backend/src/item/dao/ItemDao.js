const PgPool = require("../../providers/db/PgPool");

class ItemDao {

    async existsById(id) {
        return PgPool.withTransaction(async (client) => {
            const {rows} = await client.query(
                'SELECT 1 FROM items WHERE id = $1 LIMIT 1',
                [id],
            );

            return rows.length > 0;
        })

    }

    async insertBatch(ids) {
        return PgPool.withTransaction(async (client) => {
            if (ids.length === 0)
                return;

            await client.query(
                `INSERT INTO items (id)
                 SELECT *
                 FROM UNNEST($1::bigint[])
                 ON CONFLICT (id) DO NOTHING`,
                [ids],
            );
        })
    }

    async updateSelectionBatch(toSelect, toDeselect) {
        return PgPool.withTransaction(async (client) => {
            let selectedWithWeights = [];

            if (toSelect.length > 0) {
                const {rows} = await client.query(
                    `UPDATE items
                     SET is_selected = TRUE,
                         selected_at = NOW(),
                         sort_weight = EXTRACT(EPOCH FROM NOW()) * 1000 + id
                     WHERE id = ANY ($1::bigint[])
                     RETURNING id, sort_weight`,
                    [toSelect],
                );
                selectedWithWeights = rows.map((r) => ({
                    id: Number(r.id),
                    sortWeight: Number(r.sort_weight),
                }));
            }

            if (toDeselect.length > 0)
                await client.query(
                    `UPDATE items
                     SET is_selected = FALSE,
                         sort_weight = 0,
                         selected_at = NULL
                     WHERE id = ANY ($1::bigint[])`,
                    [toDeselect],
                );

            return {selectedWithWeights};
        })
    }

    async updateWeightsBatch(ids, weights) {
        return PgPool.withTransaction(async (client) => {
            if (ids.length === 0)
                return;

            await client.query(
                `UPDATE items AS i
                 SET sort_weight = u.weight
                 FROM UNNEST($1::bigint[], $2::double precision[]) AS u(id, weight)
                 WHERE i.id = u.id`,
                [ids, weights],
            );
        })
    }

    async fetchUnselected(limit, direction, search, cursor, isolation) {
        if (!direction)
            direction = 'asc';

        const cmp = direction === 'asc' ? '>' : '<';
        const order = direction === 'asc' ? 'ASC' : 'DESC';

        const params = [];
        const conditions = ['is_selected = FALSE'];

        const hasCursor =
            cursor !== null &&
            cursor !== undefined &&
            !Number.isNaN(cursor);

        if (hasCursor) {
            params.push(cursor);
            conditions.push(`id ${cmp} $${params.length}`);
        }
        if (search) {
            params.push(`${search}%`);
            conditions.push(`id::text LIKE $${params.length}`);
        }

        params.push(limit);

        return PgPool.withTransaction(async (client) => {
            const {rows} = await client.query(
                `SELECT id
                 FROM items
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY id ${order}
                 LIMIT $${params.length}`,
                params,
            );

            const items = rows.map((r) => Number(r.id));
            const nextCursor = items.length === limit ? items[items.length - 1] : null;
            return {items, nextCursor};
        }, isolation)
    }

    async fetchSelected(limit, direction, search, cursor, isolation) {
        if (!direction)
            direction = 'asc';

        const cmp = direction === 'asc' ? '>' : '<';
        const order = direction === 'asc' ? 'ASC' : 'DESC';

        const params = [];
        const conditions = ['is_selected = TRUE'];

        const hasCursor =
            cursor !== null &&
            cursor !== undefined &&
            !Number.isNaN(Number(cursor));

        if (hasCursor) {
            params.push(cursor);
            conditions.push(`sort_weight ${cmp} $${params.length}`);
        }
        if (search) {
            params.push(`${search}%`);
            conditions.push(`id::text LIKE $${params.length}`);
        }

        params.push(limit);

        return PgPool.withTransaction(async (client) => {
            const {rows} = await client.query(
                `SELECT id, sort_weight
                 FROM items
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY sort_weight ${order}, id ${order}
                 LIMIT $${params.length}`,
                params,
            );

            const items = rows.map((r) => ({
                id: Number(r.id),
                sortWeight: Number(r.sort_weight),
            }));
            const nextCursor = items.length === limit ? items[items.length - 1].sortWeight : null;
            return {items, nextCursor};
        }, isolation)
    }
}

module.exports = new ItemDao();