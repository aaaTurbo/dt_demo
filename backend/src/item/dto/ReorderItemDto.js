const ValidationError = require("../error/ValidationError");

module.exports = class ReorderItemDto {
    constructor(id, sortWeight) {
        this.id = id;
        this.sortWeight = sortWeight;
    }

    validate() {
        const id = Number(this.id);

        if (!Number.isInteger(id) || id <= 0)
            throw new ValidationError('id must be a positive integer', 'id');

        const w = Number(this.sortWeight);
        if (!Number.isFinite(w) || w < 0)
            throw new ValidationError('sortWeight must be a non-negative finite number', 'sortWeight');

        this.id = id;
        this.sortWeight = w;
    }
}