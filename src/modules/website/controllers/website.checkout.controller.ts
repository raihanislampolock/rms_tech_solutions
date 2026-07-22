import { Controller } from "../../../core/Controller";
import { HttpRequest, HttpResponse } from "../../../core/Types";
import { WebsiteCartService } from "../services/website.cart.service";
import { WebsiteOrderService } from "../services/website.order.service";

export class WebsiteCheckoutController extends Controller {

    private cartService: WebsiteCartService;
    private websiteOrderService: WebsiteOrderService;

    constructor() {

        super();

        this.cartService =
            this.getService<WebsiteCartService>("WebsiteCartService");
            this.websiteOrderService = this.getService<WebsiteOrderService>("WebsiteOrderService");

    }


    public onRegister(): void {

        this.onGet("/website/checkout",[],false, this.index);
        this.onPost("/website/checkout",[],false, this.placeOrder);
        this.onGet("/website/checkout",[],false, this.index);
        this.onPost("/website/checkout",[],false, this.placeOrder);

    }

    public async index( req: HttpRequest,resp: HttpResponse ) {

        const cart =
            req.session.cart || {
                items: []
            };

        let grandTotal = 0;

        for (const item of cart.items) {

            grandTotal +=
                Number(item.itemPrice) *
                Number(item.quantity);

        }

        // console.log("Cart Session:");
        // console.log(req.session.cart);

        return resp.view(
            "website/checkout/index",
            {

                page: "checkout",

                products: cart.items,

                grandTotal

            }

        );

    }

    public async placeOrder(req: HttpRequest,resp: HttpResponse) {

        try {

            const order =

                await this.websiteOrderService.createOrder(

                    req.body,

                    req.session

                );

            return resp.redirect(

                "/website/order-success/" +

                order.orderNumber

            );

        }

        catch (error) {

            console.error(error);

            return resp.redirect(

                "/website/checkout"

            );

        }

    }

}