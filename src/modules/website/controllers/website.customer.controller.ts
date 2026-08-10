import { Controller } from "../../../core/Controller";
import { HttpRequest, HttpResponse, NextFunc } from "../../../core/Types";
import { WebsiteCustomerService } from "../services/website.customer.service";

export class WebsiteCustomerController extends Controller {

    private websiteCustomerService: WebsiteCustomerService;

    private auth = {
        private: true,
        public: false
    };

    constructor() {

        super();

        this.websiteCustomerService =
            this.getService(
                "WebsiteCustomerService"
            );

    }

    public onRegister(): void {

        this.onGet("/rms/website.admin/customers",[],this.auth.private, this.index);

        this.onGet("/api/rms/website.admin/customers", [], this.auth.private, this.getAll);

        this.onGet("/api/rms/website.admin/customer/edit/:id",[],this.auth.private, this.edit);

        this.onPost("/api/rms/website.admin/customer/update/:id",[],this.auth.private, this.update);

    }

    public async index(req: HttpRequest, resp: HttpResponse) {

        try {

            return resp.view(

                "rms/website.admin/customers/index",

                {

                    title:
                        "Website Customers",

                    page:
                        "website-customers",

                }

            );

        }

        catch (error: any) {

            console.error(error);

            return resp.view(

                "rms/website.admin/customers/index",

                {

                    title:
                        "Website Customers",

                    page:
                        "website-customers",

                }

            );

        }

    }

    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {

            const search =
                String(req.query.search || "");

            const page =
                Number(req.query.page || 1);

            const result =
                await this.websiteCustomerService.getAll(

                    search,

                    page,

                    10

                );

            return resp.json({
                status: true,
                message: "Website customers fetched successfully",
                ...result,
            });

        } catch (error: any) {

            console.error("GetAll Website Customers Error:", error);

            return resp.status(500).json({
                status: false,
                message: "Failed to fetch Website Customers",
                data: error.message,
            });

        }
    }

    public async edit(req: HttpRequest, resp: HttpResponse) {

        const customer =
            await this.websiteCustomerService.edit(

                Number(req.params.id)

            );

        return resp.json(customer);

    }

    public async update(req: HttpRequest, resp: HttpResponse) {

        try {

            const result =
                await this.websiteCustomerService.update(

                    Number(req.params.id),

                    req.body

                );

            return resp.json(result);

        }

        catch (error) {

            return resp.json({

                status: false,

                message: error instanceof Error
                    ? error.message
                    : "An unexpected error occurred."

            });

        }

    }

}