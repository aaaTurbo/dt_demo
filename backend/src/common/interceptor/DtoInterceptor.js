module.exports = class BodyDtoInterceptor {

    constructor(type, source) {
        return (request, response, next) => {
            response.dto = Object.assign(new type(), request[source]);
            next();
        }
    }

}