import { AppDataSource } from "../../../init";
import { IWebsiteOrderRepository, IWebsiteOrder, IWebsiteOrderItem } from "../interfaces/website.order.interface";

export class WebsiteOrderRepository
implements IWebsiteOrderRepository {

    private async generateOrderNumber(
        manager: any
    ): Promise<string> {

        const today =
            new Date();

        const date =

            today.getFullYear().toString()

            + String(today.getMonth() + 1).padStart(2, "0")

            + String(today.getDate()).padStart(2, "0");

        const result =
            await manager.query(

                `
                SELECT COUNT(*)::int AS total
                FROM website_order
                WHERE DATE("createdAt") = CURRENT_DATE
                `

            );

        const next =
            String(result[0].total + 1)
                .padStart(5, "0");

        return `WEB-${date}-${next}`;

    }

    public async createOrder(
        customer: any,
        cart: any
    ): Promise<any> {

        const runner =
            AppDataSource.createQueryRunner();

        await runner.connect();

        await runner.startTransaction();

        try {

            // Create customer if not exists
            const customerId =
                await this.createOrGetCustomer(
                    runner.manager,
                    customer
                );

            // Generate Order Number
            const orderNumber =
                await this.generateOrderNumber(
                    runner.manager
                );

            // Calculate Grand Total
            let grandTotal = 0;

            for (const item of cart.items) {

                grandTotal +=
                    Number(item.itemPrice) *
                    Number(item.quantity);

            }

            // Create Order
            const orderResult =
                await runner.manager.query(

                    `
                    INSERT INTO website_order
                    (

                        "customerId",

                        "orderNumber",

                        "customerName",

                        email,

                        phone,

                        company,

                        address,

                        city,

                        country,

                        notes,

                        "grandTotal",

                        status

                    )

                    VALUES
                    (

                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12

                    )

                    RETURNING id
                    `,

                    [

                        customerId,

                        orderNumber,

                        customer.customerName,

                        customer.email,

                        customer.phone,

                        customer.company,

                        customer.address,

                        customer.city,

                        customer.country,

                        customer.notes,

                        grandTotal,

                        "Pending"

                    ]

                );

            const orderId =
                orderResult[0].id;

            // Save Order Items
            for (const item of cart.items) {

                await runner.manager.query(

                    `
                    INSERT INTO website_order_items
                    (

                        "orderId",

                        "itemId",

                        "itemName",

                        quantity,

                        price,

                        total

                    )

                    VALUES
                    (

                        $1,$2,$3,$4,$5,$6

                    )
                    `,

                    [

                        orderId,

                        item.id,

                        item.itemName,

                        item.quantity,

                        item.itemPrice,

                        Number(item.itemPrice) *
                        Number(item.quantity)

                    ]

                );

            }

            await runner.commitTransaction();

            return {

                id: orderId,

                orderNumber

            };

        }

        catch (error) {

            await runner.rollbackTransaction();

            throw error;

        }

        finally {

            await runner.release();

        }

    }

    public async getAll(
        searchStr: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{
        data: any[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {

        try {

            const offset = (page - 1) * limit;

            const whereClauses: string[] = [];
            const params: any[] = [];

            if (searchStr) {

                whereClauses.push(`
                (
                    wo."orderNumber" ILIKE $${params.length + 1}
                    OR wo."customerName" ILIKE $${params.length + 1}
                    OR wo.phone ILIKE $${params.length + 1}
                    OR wo.email ILIKE $${params.length + 1}
                    OR wo.company ILIKE $${params.length + 1}
                    OR wo.status ILIKE $${params.length + 1}
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
                    wo.id,
                    wo."orderNumber",
                    wo."customerName",
                    wo.phone,
                    wo.email,
                    wo.company,
                    wo."grandTotal",
                    wo.status,
                    wo."createdAt"
                FROM website_order wo
                ${whereSQL}
                ORDER BY wo."createdAt" DESC
                LIMIT $${params.length + 1}
                OFFSET $${params.length + 2}
            `;

            const countQuery = `
                SELECT COUNT(*) AS total
                FROM website_order wo
                ${whereSQL}
            `;

            const data = await AppDataSource.query(
                query,
                [...params, limit, offset]
            );

            const countResult = await AppDataSource.query(
                countQuery,
                params
            );

            const total = Number(countResult[0].total);

            return {
                data,
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };

        } catch (error) {

            console.error(error);
            throw new Error("Failed to fetch website orders.");

        }

    }

    public async edit(id: number): Promise<IWebsiteOrder | null> {
        try {

            const query = `
                SELECT
                    wo.id,
                    wo."orderNumber",
                    wo."customerName",
                    wo.email,
                    wo.phone,
                    wo.company,
                    wo.address,
                    wo.city,
                    wo.country,
                    wo.notes,
                    wo."grandTotal",
                    wo.status,
                    wo."createdAt",
                    wo."updatedAt",
                    woi.id AS "orderItemId",
                    woi."itemId",
                    woi."itemName",
                    i."itemModel",
                    woi.quantity,
                    woi.price,
                    woi.total
                FROM website_order wo
                LEFT JOIN website_order_items woi
                    ON wo.id = woi."orderId"
                LEFT JOIN rms_items i
                    ON woi."itemId" = i.id
                WHERE wo.id = $1
                ORDER BY woi.id;
            `;

            const result = await AppDataSource.query(query, [id]);

            if (!result.length) {
                return null;
            }

            // Build response
            const order = {
                id: result[0].id,
                orderNumber: result[0].orderNumber,
                customerName: result[0].customerName,
                email: result[0].email,
                phone: result[0].phone,
                company: result[0].company,
                address: result[0].address,
                city: result[0].city,
                country: result[0].country,
                notes: result[0].notes,
                grandTotal: result[0].grandTotal,
                status: result[0].status,
                createdAt: result[0].createdAt,
                updatedAt: result[0].updatedAt,
                items: [] as IWebsiteOrderItem[]
            };

            result.forEach((row: any) => {

                // Skip if order has no items
                if (!row.itemId) {
                    return;
                }

                const item: IWebsiteOrderItem = {
                    id: row.id,
                    itemId: row.itemId,
                    itemName: row.itemName,
                    itemModel: row.itemModel,
                    quantity: Number(row.quantity),
                    price: Number(row.price),
                    total: Number(row.total)
                };

                order.items!.push(item);

            });

            return order;

        } catch (error) {

            console.error("Error fetching Website Order:", error);
            throw new Error("Failed to fetch Website Order.");

        }
    }

    public async update(id: number, data: Partial<IWebsiteOrder>): Promise<any> {

        try {

            const query = `
                UPDATE website_order
                SET
                    status = $2,
                    "updatedAt" = NOW()
                WHERE id = $1
            `;

            await AppDataSource.query(query, [
                id,
                data.status
            ]);

            return {
                status: true,
                message: "Website Order updated successfully."
            };

        } catch (error) {

            console.error("Error updating Website Order:", error);
            throw new Error("Failed to update Website Order.");

        }

    }

    private async createOrGetCustomer(
        manager: any,
        customer: any
    ): Promise<number> {

        // Check if customer already exists
        const existing =
            await manager.query(

                `
                SELECT id
                FROM website_customers
                WHERE
                    LOWER(email) = LOWER($1)
                    OR phone = $2
                LIMIT 1
                `,

                [
                    customer.email || null,
                    customer.phone || null
                ]

            );

        // If customer already exists
        if (existing.length > 0) {

            return existing[0].id;

        }

        // Generate Customer Code
        const today = new Date();

        const date =
            today.getFullYear().toString() +
            String(today.getMonth() + 1).padStart(2, "0") +
            String(today.getDate()).padStart(2, "0");

        const count =
            await manager.query(

                `
                SELECT COUNT(*)::int AS total
                FROM website_customers
                WHERE DATE("createdAt") = CURRENT_DATE
                `

            );

        const customerCode =
            `CUS-${date}-${String(count[0].total + 1).padStart(5, "0")}`;

        // Create new customer
        const result =
            await manager.query(

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

                    status

                )

                VALUES
                (

                    $1,$2,$3,$4,$5,$6,$7,$8,$9

                )

                RETURNING id

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

                    "Active"

                ]

            );

        return result[0].id;

    }
}