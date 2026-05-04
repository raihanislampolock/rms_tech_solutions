import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsItemStockService } from "../services/rms.itemstock.service";

export class RmsItemStockController extends Controller {

    private rmsItemStockService: RmsItemStockService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsItemStockService = this.getService("RmsItemStockService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-stock", [], this.auth.private, this.index);
        this.onGet("/api/rms/rms-stock/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-stock/edit/:id", [], this.auth.private, this.edit);
        this.onGet("/api/rms/rms-stock/by-item/:itemId", [], this.auth.private, this.getByItemId);
    }

    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        return resp.view("rms/rms-stock/index");
    }

    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const { search, page = 1, limit = 10 } = req.query;

            const searchStr = typeof search === "string" ? search.trim() : "";
            const pageNum = Math.max(Number(page), 1);
            const limitNum = Math.min(Math.max(Number(limit), 1), 100);

            const result = await this.rmsItemStockService.getAll(
                searchStr,
                pageNum,
                limitNum
            );

            return resp.json({
                status: true,
                message: "Stock fetched successfully",
                ...result,
            });

        } catch (error: any) {
            console.error("GetAll Stock Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch stock data",
                data: error.message,
            });
        }
    }

    public async edit(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid stock id",
                });
            }

            const result = await this.rmsItemStockService.edit(id);

            return resp.json({
                status: true,
                message: "Stock fetched successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Edit Stock Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch stock",
                data: error.message,
            });
        }
    }

    public async getByItemId(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const itemId = Number(req.params.itemId);

            if (!itemId) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid item id",
                });
            }

            const result = await this.rmsItemStockService.getByItemId(itemId);

            if (!result) {
                return resp.status(404).json({
                    status: false,
                    message: "Stock not found for this item",
                    data: null,
                });
            }

            return resp.json({
                status: true,
                message: "Stock fetched successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Get Stock by ItemId Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch stock",
                data: error.message,
            });
        }
    }
}
