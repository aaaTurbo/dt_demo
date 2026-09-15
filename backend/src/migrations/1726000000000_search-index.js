exports.up = (pgm) => {
    pgm.createTable('state_revision', {
        id: { type: 'int', primaryKey: true, default: 1 },
        value: { type: 'bigint', notNull: true, default: 0 },
    });

    pgm.sql('INSERT INTO state_revision (id, value) VALUES (1, 0)');

    pgm.sql(`
    CREATE INDEX idx_items_unselected_id_text
      ON items ((id::text) text_pattern_ops)
      WHERE is_selected = FALSE;
  `);

    pgm.sql(`
    CREATE INDEX idx_items_selected_id_text
      ON items ((id::text) text_pattern_ops)
      WHERE is_selected = TRUE;
  `);
};

exports.down = (pgm) => {
    pgm.sql('DROP INDEX IF EXISTS idx_items_unselected_id_text');
    pgm.sql('DROP INDEX IF EXISTS idx_items_selected_id_text');
    pgm.dropTable('state_revision');
};