import { AppDataSource } from "../../../init";
import {
    IWebsiteProductList,
    IWebsiteProductRepository
} from "../interfaces/website.product.interface";

export class WebsiteProductRepository implements IWebsiteProductRepository {

    private normalizeImageUrl(files: string | null | undefined): string {

        if (!files || files.trim() === "") {
            return "/img/products/no-image.png";
        }

        const value = files.trim();

        if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
            return value;
        }

        return `/${value}`;

    }

    public async getFeaturedProducts(): Promise<IWebsiteProductList[]> {

        try {

            const query = `
                SELECT

                    i.id,
                    i."itemName",
                    i."itemModel",
                    i."itemPrice",
                    i.files,

                    COALESCE(
                        s."availableQuantity",
                        0
                    ) AS "availableQuantity",

                    w.featured,
                    w."websiteVisible",
                    w.slug

                FROM rms_items i

                LEFT JOIN rms_item_stocks s
                    ON s."itemId" = i.id

                INNER JOIN website_products w
                    ON w."itemId" = i.id

                WHERE

                    w.featured = true

                    AND

                    w."websiteVisible" = true

                ORDER BY

                    i."itemName" ASC

                LIMIT 8
            `;

            const rows = await AppDataSource.query(query);

            return rows.map((product: any) => ({
                ...product,
                files: this.normalizeImageUrl(product.files)
            }));

        } catch (error) {

            console.error("Error fetching featured products:", error);
            throw new Error("Failed to fetch featured products.");

        }

    }

    public async getProductBySlug(slug: string): Promise<any> {

        try {

            const query = `
                SELECT

                    i.id,
                    i."itemName",
                    i."itemModel",
                    i."itemPrice",
                    i."itemConfigurations",
                    i."manufactureOrigin",
                    i."itemType",
                    i.files,

                    COALESCE(
                        s."availableQuantity",
                        0
                    ) AS "availableQuantity",

                    w.featured,
                    w."websiteVisible",
                    w.slug

                FROM rms_items i

                LEFT JOIN rms_item_stocks s
                    ON s."itemId" = i.id

                INNER JOIN website_products w
                    ON w."itemId" = i.id

                WHERE

                    w.slug = $1

                LIMIT 1
            `;

            const result = await AppDataSource.query(query, [slug]);

            if (!result.length) {
                return null;
            }

            const product = result[0];

            return {
                ...product,
                files: this.normalizeImageUrl(product.files)
            };

        } catch (error) {

            console.error("Error fetching product details:", error);
            throw new Error("Failed to fetch product details.");

        }

    }

    public async getProducts(
        search: string = "",
        category: string = "",
        page: number = 1,
        limit: number = 12
    ): Promise<any> {

        try {

            const offset = (page - 1) * limit;

            const whereClauses: string[] = [
                // `w."websiteVisible" = true`
            ];

            const params: any[] = [];

            if (search) {

                whereClauses.push(`

                    (

                        i."itemName" ILIKE $${params.length + 1}

                        OR

                        i."itemModel" ILIKE $${params.length + 1}

                    )

                `);

                params.push(`%${search}%`);

            }

            if (category) {

                whereClauses.push(`

                    i."itemType" = $${params.length + 1}

                `);

                params.push(category);

            }

            const whereSQL =
                whereClauses.length > 0
                    ? `WHERE ${whereClauses.join(" AND ")}`
                    : "";

            const query = `
                SELECT

                    i.id,
                    i."itemName",
                    i."itemModel",
                    i."itemPrice",
                    i.files,
                    i."itemType",

                    COALESCE(
                        s."availableQuantity",
                        0
                    ) AS "availableQuantity"

                FROM rms_items i

                LEFT JOIN rms_item_stocks s
                    ON s."itemId" = i.id

                ${whereSQL}

                ORDER BY

                    i."itemName" ASC

                LIMIT $${params.length + 1}

                OFFSET $${params.length + 2}
            `;

            const countQuery = `
                SELECT

                    COUNT(i.id) AS total

                FROM rms_items i

                LEFT JOIN rms_item_stocks s
                    ON s."itemId" = i.id

                ${whereSQL}
            `;

            const data = await AppDataSource.query(
                query,
                [...params, limit, offset]
            );

            const normalizedData = data.map((product: any) => ({
                ...product,
                files: this.normalizeImageUrl(product.files)
            }));

            const countResult = await AppDataSource.query(
                countQuery,
                params
            );

            const total = parseInt(countResult[0]?.total || "0", 10);

            return {

                data: normalizedData,

                total,

                totalPages: Math.ceil(total / limit),

                currentPage: page

            };

        } catch (error) {

            console.error("Error fetching website products:", error);
            throw new Error("Failed to fetch website products.");

        }

    }

    public async getProductById(id: number): Promise<any> {

        try {

            const query = `
                SELECT

                    i.id,
                    i."itemName",
                    i."itemModel",
                    i."itemPrice",
                    i."itemConfigurations",
                    i."manufactureOrigin",
                    i."itemType",
                    i.files,

                    COALESCE(
                        s."availableQuantity",
                        0
                    ) AS "availableQuantity",

                    w.featured,
                    w."websiteVisible",
                    w.slug

                FROM rms_items i

                LEFT JOIN rms_item_stocks s
                    ON s."itemId" = i.id

                LEFT JOIN website_products w
                    ON w."itemId" = i.id

                WHERE i.id = $1

                LIMIT 1
            `;

            const result = await AppDataSource.query(query, [id]);

            if (!result.length) {
                return null;
            }

            const product = result[0];

            return {

                ...product,

                files: this.normalizeImageUrl(product.files)

            };

        } catch (error) {

            console.error("Error fetching product by id:", error);

            throw new Error("Failed to fetch product.");

        }

    }

}