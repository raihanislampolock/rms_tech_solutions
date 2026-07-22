import { Controller } from "../../../core/Controller";
import { HttpRequest, HttpResponse, NextFunc } from "../../../core/Types";
import { WebsiteOrderService } from "../services/website.order.service";

export class WebsiteOrderController extends Controller {

    private websiteOrderService: WebsiteOrderService;
    private auth = {
        private: true,
        public: false
    };

    constructor() {

        super();

        this.websiteOrderService = this.getService<WebsiteOrderService>("WebsiteOrderService");

    }

    public onRegister(): void {

        this.onGet("/rms/website-orders",[],this.auth.private, this.index);
        this.onGet("/api/rms/website-orders", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/website-orders/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/website-orders/update/:id", [], this.auth.private, this.update);

    }

    public async index( req: HttpRequest, resp: HttpResponse ) {

        try {

            return resp.view(

                "rms/website-orders/index",

                {

                    title: "Website Orders",

                    page: "website-orders",

                }

            );

        } catch (error) {

            console.error(error);

            return resp.view(

                "rms/website-orders/index",

                {

                    title: "Website Orders",

                    page: "website-orders",

                    orders: []

                }

            );

        }

    }

    // ✅ GET ALL WEBSITE ORDERS
    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {

            const { search, page = 1, limit = 10 } = req.query;

            const searchStr = typeof search === "string"
                ? search.trim()
                : "";

            const pageNum = Math.max(Number(page), 1);
            const limitNum = Math.min(Math.max(Number(limit), 1), 100);

            const result = await this.websiteOrderService.getAll(
                searchStr,
                pageNum,
                limitNum
            );

            return resp.json({
                status: true,
                message: "Website orders fetched successfully",
                ...result,
            });

        } catch (error: any) {

            console.error("GetAll Website Orders Error:", error);

            return resp.status(500).json({
                status: false,
                message: "Failed to fetch Website Orders",
                data: error.message,
            });

        }
    }

    // ✅ GET SINGLE WEBSITE ORDER
    public async edit(req: HttpRequest, resp: HttpResponse, next: NextFunc) {

        try {

            const id = Number(req.params.id);

            if (!id) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid Website Order ID",
                });
            }

            const result = await this.websiteOrderService.edit(id);

            if (!result) {
                return resp.status(404).json({
                    status: false,
                    message: "Website Order not found",
                });
            }

            return resp.json({
                status: true,
                message: "Website Order fetched successfully",
                data: result,
            });

        } catch (error: any) {

            console.error("Edit Website Order Error:", error);

            return resp.status(500).json({
                status: false,
                message: "Failed to fetch Website Order",
                data: error.message,
            });

        }

    }

    // ✅ UPDATE WEBSITE ORDER STATUS
    public async update(req: HttpRequest, resp: HttpResponse, next: NextFunc) {

        try {

            const id = Number(req.params.id);

            if (!id) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid Website Order ID",
                });
            }

            // Check existing order
            const existing = await this.websiteOrderService.edit(id);

            if (!existing) {
                return resp.status(404).json({
                    status: false,
                    message: "Website Order not found",
                });
            }

            const { status } = req.body;

            const result = await this.websiteOrderService.update(id, {
                status: status ?? existing.status,
            });

            return resp.json({
                status: true,
                message: "Website Order updated successfully",
                data: result,
            });

        } catch (error: any) {

            console.error("Update Website Order Error:", error);

            return resp.status(500).json({
                status: false,
                message: "Failed to update Website Order",
                data: error.message,
            });

        }

    }

}