import { IWebsiteProductList } from "../interfaces/website.product.interface";
import { WebsiteProductRepository } from "../repositories/website.product.repository";

export class WebsiteProductService {

    constructor(
        private websiteProductRepository: WebsiteProductRepository
    ) {}

    public async getFeaturedProducts(): Promise<IWebsiteProductList[]> {

        return await this.websiteProductRepository.getFeaturedProducts();

    }

    public async getProductBySlug(slug: string) {

        return await this.websiteProductRepository.getProductBySlug(slug);

    }

    public async getProducts( search: string = "", category: string = "", page: number = 1, limit: number = 12 ) {

        return await this.websiteProductRepository.getProducts( search, category, page, limit );

    }

    public async getProductById(id: number): Promise<any> {

        return await this.websiteProductRepository.getProductById(id);

    }

}