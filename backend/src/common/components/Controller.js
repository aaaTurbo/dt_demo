const express = require("express");


class Controller {

    static _controller = express.Router();

    static {
        this._controller.get('/health', (req, res) => {
            res.
            status(200)
                .send('Healthy');
        })
    }

    static get controller() {
        return this._controller;
    }

}

module.exports = Controller;