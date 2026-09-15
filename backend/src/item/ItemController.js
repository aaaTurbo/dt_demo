const Controller = require("../common/components/Controller");

const DtoInterceptor = require("../common/interceptor/DtoInterceptor");
const ParamsToBodyInterceptor = require("../common/interceptor/ParamsToBodyInterceptor");

const DtoValidator = require("../common/validator/DtoValidator");

const PageDto = require("./dto/PageDto");
const AddItemDto = require("./dto/AddItemDto");
const SelectItemDto = require("./dto/SelectItemDto");

const ItemService = require("./ItemService");
const ReorderItemDto = require("./dto/ReorderItemDto");

class ItemController extends Controller {

    static #service = ItemService;

    static {
        this._controller.get("/",
            new DtoInterceptor(PageDto, 'query'),
            DtoValidator,
            async (request, response, next) => {
            try {
                response
                    .json(await this.#service.listItems(response.dto))
            } catch (err) {
                next(err)
            }
        })

        this._controller.get("/selected",
            new DtoInterceptor(PageDto, 'query'),
            DtoValidator,
            async (request, response, next) => {
            try {
                response
                    .json(await this.#service.listSelected(response.dto))
            } catch (err) {
                next(err)
            }
        })

        this._controller.get("/state",
            new DtoInterceptor(PageDto, 'query'),
            DtoValidator,
            async (request, response, next) => {
            try {
                response
                    .json(await this.#service.getState(response.dto));
            } catch (err) {
                next(err);
            }
        })

        this._controller.post("/",
            new DtoInterceptor(AddItemDto, 'body'),
            DtoValidator,
            async (request, response, next) => {
            try {
                response
                    .status(202)
                    .json(await this.#service.createItem(response.dto));
            } catch (err) {
                next(err);
            }
        })

        this._controller.post('/:id/select',
            ParamsToBodyInterceptor,
            new DtoInterceptor(SelectItemDto, 'body'),
            DtoValidator,
            async (request, response, next) => {
            try {
                response
                    .status(202)
                    .json(await this.#service.selectItem(response.dto));
            } catch (err) {
                next(err);
            }
        })

        this._controller.post("/:id/reorder",
            ParamsToBodyInterceptor,
            new DtoInterceptor(ReorderItemDto, 'body'),
            DtoValidator,
            async (request, response, next) => {
            try {
                response
                    .status(202)
                    .json(await this.#service.reorderItem(response.dto));
            } catch (err) {
                next(err);
            }
        })

    }

}

module.exports = ItemController.controller;