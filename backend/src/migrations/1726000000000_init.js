exports.up = (pgm) => {
    pgm.createTable('items', {
        id: {
            type: 'bigint',
            primaryKey: true,
            notNull: true,
        },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('NOW()'),
        },
        is_selected: {
            type: 'boolean',
            notNull: true,
            default: false,
        },
        sort_weight: {
            type: 'double precision',
            notNull: true,
            default: 0,
        },
        selected_at: {
            type: 'timestamptz',
            notNull: false,
        },
    });

    pgm.createIndex('items', 'id', {
        name: 'idx_items_unselected',
        where: 'is_selected = FALSE',
    });

    pgm.createIndex('items', ['sort_weight', 'id'], {
        name: 'idx_items_selected',
        where: 'is_selected = TRUE',
    });
}

exports.down = (pgm) => {
    pgm.dropTable('items');
}