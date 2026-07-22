import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { WebsiteProductService } from "../services/website.product.service";

export class WebsiteController extends Controller {

    private websiteProductService: WebsiteProductService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.websiteProductService = this.getService("WebsiteProductService");
    }

    public onRegister(): void {

        // Website Home
        this.onGet("/website", [], this.auth.public, this.home);
        this.onGet("/website/products/:slug",[],this.auth.public, this.fproductDetails);
        this.onGet("/website/products",[],this.auth.public, this.products);
        this.onGet("/website/products/details/:id", [], this.auth.public, this.productDetails);
        this.onGet("/website/order-success/:orderNumber",[],false, this.orderSuccess);

    }

    public async home(req: HttpRequest, resp: HttpResponse, next: NextFunc) {

        try {

            const featuredProducts =
                await this.websiteProductService.getFeaturedProducts();

            return resp.view("website/home/index", {
                title: "RMS Tech Solutions",
                page: "home",
                featuredProducts
            });

        } catch (error) {

            console.error("Website Home Error:", error);

            return resp.view("website/home/index", {
                title: "RMS Tech Solutions",
                page: "home",
                featuredProducts: []
            });

        }

    }

    public async fproductDetails( req: HttpRequest, resp: HttpResponse) {

        const product =
            await this.websiteProductService.getProductBySlug(
                req.params.slug
            );

        if (!product) {

            return resp.status(404).render("404");

        }

        return resp.view(
            "website/products/details",
            {
                page: "products",
                product
            }
           );

    }

    public async products( req: HttpRequest, resp: HttpResponse, next: NextFunc ) {

        try {

            const search = String(req.query.search || "");
            const category = String(req.query.category || "");
            const page = Number(req.query.page || 1);

            const result = await this.websiteProductService.getProducts(
                search,
                category,
                page,
                12
            );

            return resp.view("website/products/index", {

                title: "Products",

                page: "products",

                products: result.data,

                pagination: result,

                filters: {
                    search,
                    category
                }

            });

        } catch (error) {

            console.error(error);

            return resp.view("website/products/index", {

                title: "Products",

                page: "products",

                products: [],

                pagination: {
                    currentPage: 1,
                    totalPages: 0
                },

                filters: {
                    search: "",
                    category: ""
                }

            });

        }

    }

    public async productDetails(req: HttpRequest, resp: HttpResponse) {

        const id = Number(req.params.id);

        if (isNaN(id)) {
            return resp.status(400).send("Invalid product id");
        }

        const product = await this.websiteProductService.getProductById(id);

        if (!product) {
            return resp.redirect("/website/products");
        }

        return resp.view("website/products/details", {
            page: "products",
            product
        });
    }

    public async orderSuccess(req: HttpRequest,resp: HttpResponse) {

        return resp.view(

            "website/order-success/index",

            {

                page: "order-success",

                orderNumber:

                    req.params.orderNumber

            }

        );

    }

}