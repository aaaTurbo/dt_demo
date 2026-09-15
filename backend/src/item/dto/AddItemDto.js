const ValidationError = require("../error/ValidationError");

const MAX_ID = process.env.MAX_ID;

module.exports = class AddItemDto {
    constructor(id) {
        this.id = id;
    }

    validate() {
        const id = Number(this.id);

        if (!Number.isInteger(id) || id <= 0 || id > MAX_ID)
            throw new ValidationError('id must be a positive integer', 'id');

        this.id = id;
    }

}