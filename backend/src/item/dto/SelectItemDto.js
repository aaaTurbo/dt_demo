const ValidationError = require("../error/ValidationError");

module.exports = class SelectItemDto {
    constructor(id, isSelected) {
        this.id = id;
        this.isSelected = isSelected;
    }

    validate() {
        const id = Number(this.id);

        if (!Number.isInteger(id) || id <= 0)
            throw new ValidationError('id must be a positive integer', 'id');

        if (typeof this.isSelected !== 'boolean')
            throw new ValidationError('isSelected must be a boolean', 'isSelected');

        this.id = id;
    }
}