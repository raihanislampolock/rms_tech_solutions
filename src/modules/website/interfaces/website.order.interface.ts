import { WebsiteOrder } from "../models/website_order";

export interface IWebsiteOrderRepository {

    createOrder(
        customer: any,
        cart: any
    ): Promise<any>;

}

export interface IWebsiteOrderRepository {

    createOrder(
        customer: any,
        cart: any
    ): Promise<any>;

}

export interface IWebsiteOrderItem {

    id: number;
    itemId: number;

    itemName: string;
    itemModel?: string;

    quantity: number;
    price: number;
    total: number;

}

export interface IWebsiteOrder {

    id: number;

    orderNumber: string;

    customerName: string;

    email: string;

    phone: string;

    company?: string;

    address?: string;

    city?: string;

    country?: string;

    notes?: string;

    grandTotal: number;

    status: string;

    createdAt: Date;

    updatedAt: Date;

    items?: IWebsiteOrderItem[];

}

export interface IWebsiteOrderRepository {

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IWebsiteOrder[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;

    edit(id: number): Promise<IWebsiteOrder | null>;

    update(
        id: number,
        updateData: Partial<IWebsiteOrder>
    ): Promise<any>;
}