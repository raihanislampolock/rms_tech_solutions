import { WebsiteProductModel } from "../models/website.product.model";

export interface IWebsiteProduct {
    id: number;
    itemId: number;
    featured: boolean;
    websiteVisible: boolean;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IWebsiteProductList {
    id: number;
    itemName: string;
    itemModel: string;
    itemPrice: string;
    files: string;
    availableQuantity: number;
    featured: boolean;
    websiteVisible: boolean;
    slug: string;
}

export interface IWebsiteProductRepository {

    getFeaturedProducts(): Promise<IWebsiteProductList[]>;

    getProductBySlug(slug: string): Promise<any>;

    getProducts(
        search?: string,
        category?: string,
        page?: number,
        limit?: number
    ): Promise<any>;

}