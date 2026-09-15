module.exports = class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
        this.field = field;
    }
}