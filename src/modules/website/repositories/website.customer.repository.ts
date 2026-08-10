import { AppDataSource } from "../../../init";
import { IWebsiteCustomer, IWebsiteCustomerRepository } from "../interfaces/website.customer.interface";

export class WebsiteCustomerRepository implements IWebsiteCustomerRepository {

    /**
     * Generate Customer Code
     * Example:
     * CUS-20260723-00001
     */
    private async generateCustomerCode(
        manager: any
    ): Promise<string> {

        const today = new Date();

        const date =
            today.getFullYear().toString() +
            String(today.getMonth() + 1).padStart(2, "0") +
            String(today.getDate()).padStart(2, "0");

        const result =
            await manager.query(

                `
                SELECT COUNT(*)::int AS total
                FROM website_customers
                WHERE DATE("createdAt") = CURRENT_DATE
                `

            );

        const next =
            String(result[0].total + 1)
                .padStart(5, "0");

        return `CUS-${date}-${next}`;

    }

    /**
     * Create Customer
     */
    public async create(
        customer: IWebsiteCustomer
    ): Promise<IWebsiteCustomer> {

        const runner =
            AppDataSource.createQueryRunner();

        await runner.connect();

        await runner.startTransaction();

        try {

            const customerCode =
                await this.generateCustomerCode(
                    runner.manager
                );

            const result =
                await runner.manager.query(

                    `
                    INSERT INTO website_customers
                    (

                        "customerCode",

                        "customerName",

                        email,

                        phone,

                        company,

                        address,

                        city,

                        country,

                        password,

                        status

                    )

                    VALUES
                    (

                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10

                    )

                    RETURNING *

                    `,

                    [

                        customerCode,

                        customer.customerName,

                        customer.email || null,

                        customer.phone || null,

                        customer.company || null,

                        customer.address || null,

                        customer.city || null,

                        customer.country || null,

                        customer.password || null,

                        customer.status || "Active"

                    ]

                );

            await runner.commitTransaction();

            return result[0];

        }

        catch (error) {

            await runner.rollbackTransaction();

            console.error(
                "Error creating Website Customer:",
                error
            );

            throw error;

        }

        finally {

            await runner.release();

        }

    }

    public async getAll(
        searchStr: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{

        data: any[];

        total: number;

        totalPages: number;

        currentPage: number;

    }> {

        try {

            const offset =
                (page - 1) * limit;

            const whereClauses: string[] = [];

            const params: any[] = [];

            if (searchStr) {

                whereClauses.push(`

                    (

                        wc."customerCode" ILIKE $${params.length + 1}

                        OR wc."customerName" ILIKE $${params.length + 1}

                        OR wc.email ILIKE $${params.length + 1}

                        OR wc.phone ILIKE $${params.length + 1}

                        OR wc.company ILIKE $${params.length + 1}

                        OR wc.city ILIKE $${params.length + 1}

                        OR wc.country ILIKE $${params.length + 1}

                        OR wc.status ILIKE $${params.length + 1}

                    )

                `);

                params.push(`%${searchStr}%`);

            }

            const whereSQL =

                whereClauses.length > 0

                    ? `WHERE ${whereClauses.join(" AND ")}`

                    : "";

            const query = `

                SELECT

                    wc.id,

                    wc."customerCode",

                    wc."customerName",

                    wc.email,

                    wc.phone,

                    wc.company,

                    wc.city,

                    wc.country,

                    wc.status,

                    wc."createdAt"

                FROM website_customers wc

                ${whereSQL}

                ORDER BY wc."createdAt" DESC

                LIMIT $${params.length + 1}

                OFFSET $${params.length + 2}

            `;

            const countQuery = `

                SELECT COUNT(*) AS total

                FROM website_customers wc

                ${whereSQL}

            `;

            const data =

                await AppDataSource.query(

                    query,

                    [...params, limit, offset]

                );

            const countResult =

                await AppDataSource.query(

                    countQuery,

                    params

                );

            const total =
                Number(countResult[0].total);

            return {

                data,

                total,

                totalPages:
                    Math.ceil(total / limit),

                currentPage:
                    page

            };

        }

        catch (error) {

            console.error(
                "Error fetching Website Customers:",
                error
            );

            throw new Error(
                "Failed to fetch Website Customers."
            );

        }

    }

    public async edit(
        id: number
    ): Promise<IWebsiteCustomer | null> {

        try {

            const query = `

                SELECT

                    wc.id,

                    wc."customerCode",

                    wc."customerName",

                    wc.email,

                    wc.phone,

                    wc.company,

                    wc.address,

                    wc.city,

                    wc.country,

                    wc.status,

                    wc."createdAt",

                    wc."updatedAt"

                FROM website_customers wc

                WHERE wc.id = $1

            `;

            const result =
                await AppDataSource.query(
                    query,
                    [id]
                );

            if (!result.length) {

                return null;

            }

            return result[0];

        }

        catch (error) {

            console.error(
                "Error fetching Website Customer:",
                error
            );

            throw new Error(
                "Failed to fetch Website Customer."
            );

        }

    }

    public async update(
        id: number,
        data: Partial<IWebsiteCustomer>
    ): Promise<any> {

        try {

            const query = `

                UPDATE website_customers

                SET

                    "customerName" = $2,

                    email = $3,

                    phone = $4,

                    company = $5,

                    address = $6,

                    city = $7,

                    country = $8,

                    status = $9,

                    "updatedAt" = NOW()

                WHERE id = $1

            `;

            await AppDataSource.query(

                query,

                [

                    id,

                    data.customerName,

                    data.email,

                    data.phone,

                    data.company,

                    data.address,

                    data.city,

                    data.country,

                    data.status

                ]

            );

            return {

                status: true,

                message:
                    "Website Customer updated successfully."

            };

        }

        catch (error) {

            console.error(
                "Error updating Website Customer:",
                error
            );

            throw new Error(
                "Failed to update Website Customer."
            );

        }

    }

    public async getByEmail(
        email: string
    ): Promise<IWebsiteCustomer | null> {

        try {

            const query = `

                SELECT *

                FROM website_customers

                WHERE LOWER(email) = LOWER($1)

                LIMIT 1

            `;

            const result =
                await AppDataSource.query(
                    query,
                    [email]
                );

            if (!result.length) {

                return null;

            }

            return result[0];

        }

        catch (error) {

            console.error(
                "Error fetching Website Customer by Email:",
                error
            );

            throw new Error(
                "Failed to fetch Website Customer."
            );

        }

    }

    public async getByPhone(
        phone: string
    ): Promise<IWebsiteCustomer | null> {

        try {

            const query = `

                SELECT *

                FROM website_customers

                WHERE phone = $1

                LIMIT 1

            `;

            const result =
                await AppDataSource.query(
                    query,
                    [phone]
                );

            if (!result.length) {

                return null;

            }

            return result[0];

        }

        catch (error) {

            console.error(
                "Error fetching Website Customer by Phone:",
                error
            );

            throw new Error(
                "Failed to fetch Website Customer."
            );

        }

    }

    public async changePassword(
        id: number,
        password: string
    ): Promise<any> {

        try {

            const query = `

                UPDATE website_customers

                SET

                    password = $2,

                    "updatedAt" = NOW()

                WHERE id = $1

            `;

            await AppDataSource.query(
                query,
                [
                    id,
                    password
                ]
            );

            return {

                status: true,

                message:
                    "Password updated successfully."

            };

        }

        catch (error) {

            console.error(
                "Error updating password:",
                error
            );

            throw new Error(
                "Failed to update password."
            );

        }

    }

    public async getById(
        id: number
    ): Promise<IWebsiteCustomer | null> {

        try {

            const query = `

                SELECT *

                FROM website_customers

                WHERE id = $1

                LIMIT 1

            `;

            const result =
                await AppDataSource.query(
                    query,
                    [id]
                );

            if (!result.length) {

                return null;

            }

            return result[0];

        }

        catch (error) {

            console.error(
                "Error fetching Website Customer:",
                error
            );

            throw new Error(
                "Failed to fetch Website Customer."
            );

        }

    }

}