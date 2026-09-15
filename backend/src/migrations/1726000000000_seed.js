exports.up =(pgm) => {

    pgm.sql(`
    INSERT INTO items (id)
    SELECT generate_series(1, 1000000)
    ON CONFLICT (id) DO NOTHING;
  `);

    pgm.sql('ANALYZE items;');
}

exports.down =(pgm) => {
    pgm.sql('TRUNCATE TABLE items;');
}

exports.noTransaction = true;