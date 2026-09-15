class ParamsToBodyInterceptor {

    constructor() {
        return (req, res, next) => {
            req.body = {...req.body, ...req.params};
            next();
        }
    }

}

module.exports = new ParamsToBodyInterceptor();