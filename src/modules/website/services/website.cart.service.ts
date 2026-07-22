import { Session } from "express-session";
import { ICart } from "../interfaces/website.cart.interface";



export class WebsiteCartService {

    private getCart(session: any): ICart {

        if (!session.cart) {

            session.cart = {
                items: []
            };

        }

        return session.cart;

    }

    public addItem(
        session: any,
        product: any,
        quantity: number
    ) {

        if (!session.cart) {

            session.cart = {
                items: []
            };

        }

        const existing = session.cart.items.find(
            (x: any) => x.id === product.id
        );

        if (existing) {

            existing.quantity += quantity;

        } else {

            session.cart.items.push({

                id: product.id,

                itemName: product.itemName,

                itemModel: product.itemModel,

                itemPrice: Number(product.itemPrice),

                files: product.files,

                quantity

            });

        }

    }

    public updateItem(session: any, productId: number, quantity: number) {

        if (!session.cart) {
            return;
        }

        const item = session.cart.items.find(
            (x: any) => x.id === productId
        );

        if (!item) {
            return;
        }

        if (quantity <= 0) {

            session.cart.items =
                session.cart.items.filter(
                    (x: any) => x.id !== productId
                );

            return;
        }

        item.quantity = quantity;

    }

    public removeItem( session: any, productId: number) {

        if (!session.cart) {
            return;
        }

        session.cart.items =
            session.cart.items.filter(
                (x: any) => x.id !== productId
            );

    }

}