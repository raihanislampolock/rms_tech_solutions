import { Controller } from "../../../core/Controller";
import { HttpRequest, HttpResponse } from "../../../core/Types";
import { WebsiteCartService } from "../services/website.cart.service";
import { WebsiteProductService } from "../services/website.product.service";

export class WebsiteCartController extends Controller {

    private cartService: WebsiteCartService;
    private productService: WebsiteProductService;

    constructor() {

        super();

        this.cartService = this.getService("WebsiteCartService") as WebsiteCartService;

        this.productService = this.getService("WebsiteProductService") as WebsiteProductService;

    }

    public onRegister(): void {

        this.onPost("/website/cart/add", [], false, this.add);

        this.onGet("/website/cart", [], false, this.index);

        this.onPost("/website/cart/update",[],false, this.update);

        this.onPost("/website/cart/remove",[],false, this.remove);

    }

    public async add(req: HttpRequest, resp: HttpResponse) {

        const productId =
            Number(req.body.id);

        const quantity =
            Number(req.body.quantity || 1);

        const product =
            await this.productService.getProductById(
                productId
            );

        if (!product) {

            return resp.redirect(
                "/website/products"
            );

        }

        this.cartService.addItem(

            req.session,

            product,

            quantity

        );

        return resp.redirect(
            "/website/cart"
        );

    }

    public async index(
        req: HttpRequest,
        resp: HttpResponse
    ) {

        const cart =
            req.session.cart || {
                items: []
            };

        let grandTotal = 0;

        for (const item of cart.items) {

            item.subtotal =
                item.itemPrice * item.quantity;

            grandTotal += item.subtotal;

        }

        return resp.view(
            "website/cart/index",
            {

                page: "cart",

                products: cart.items,

                grandTotal

            }

        );

    }

    public async update( req: HttpRequest, resp: HttpResponse) {

        console.log("UPDATE ROUTE HIT");
        console.log(req.body);

        this.cartService.updateItem(

            req.session,

            Number(req.body.id),

            Number(req.body.quantity)

        );

        return resp.redirect(
            "/website/cart"
        );

    }

    public async remove( req: HttpRequest, resp: HttpResponse) {

        console.log("REMOVE ROUTE HIT");
        console.log(req.body);

        this.cartService.removeItem(

            req.session,

            Number(req.body.id)

        );

        return resp.redirect(
            "/website/cart"
        );

    }
}