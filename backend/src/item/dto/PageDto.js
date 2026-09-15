const ValidationError = require("../error/ValidationError");

const MAX_LIMIT = process.env.MAX_LIMIT;

module.exports = class PageDto {
    constructor(limit, direction, search, cursor) {
        this.limit = limit;
        this.direction = direction;
        this.search = search;
        this.cursor = cursor;
    }

    validate() {
        const maxLimit = Number(MAX_LIMIT) || 20;
        const parsedLimit = Number(this.limit);
        this.limit = Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : maxLimit, maxLimit);

        if (this.direction == null || this.direction === '')
            this.direction = 'asc';
        else if (this.direction !== 'desc' && this.direction !== 'asc')
            throw new ValidationError('Invalid direction');

        const search = typeof this.search === 'string' ? this.search.trim() : '';

        if (search && !/^\d{1,9}$/.test(search))
            throw new ValidationError('Search must be a numeric prefix up to 9 digits', 'search');

        this.search = search;

        if (this.cursor !== undefined && this.cursor !== null && this.cursor !== '') {
            const cursor = Number(this.cursor);
            if (!Number.isFinite(cursor))
                throw new ValidationError('Cursor must be a finite number', 'cursor');
            this.cursor = cursor;
        } else {
            this.cursor = null;
        }
    }
}