class DtoValidator {
    constructor() {
        return (request, response, next) => {
            response.dto.validate();
            next();
        }
    }
}

module.exports = new DtoValidator();