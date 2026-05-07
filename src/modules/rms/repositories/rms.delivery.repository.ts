import { AppDataSource } from "../../../init";
import {
    IRmsDelivery,
    IRmsDeliveryItem,
    IRmsDeliveryRepository
} from "../interfaces/rms.delivery.interface";
import { RmsDeliveryModel } from "../models/rms.delivery.model";
import { RmsDeliveryItemModel } from "../models/rms.delivery.item.model";
import { RmsItemStockModel } from "../models/rms.itemstock.model";

export class RmsDeliveryRepository implements IRmsDeliveryRepository {

    private deliveryRepo = AppDataSource.getRepository(RmsDeliveryModel);
    private itemRepo = AppDataSource.getRepository(RmsDeliveryItemModel);

    // ✅ CREATE (Parent + Items)
    public async create(data: Partial<IRmsDelivery>): Promise<IRmsDelivery> {
        const qr = AppDataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            // 👉 1. Save delivery
            const delivery = qr.manager.create(RmsDeliveryModel, {
                deliveryNumber: data.deliveryNumber,
                quotationId: data.quotationId ?? null,
                companyName: data.companyName,
                companyEmail: data.companyEmail ?? null,
                notes: data.notes ?? null,
                deliveryStatus: data.deliveryStatus ?? 'pending',
                createdBy: data.createdBy && !isNaN(Number(data.createdBy)) ? Number(data.createdBy) : null,
            });

            const savedDelivery = await qr.manager.save(delivery);

            const stockRepo = qr.manager.getRepository(RmsItemStockModel);

            // 👉 2. Save items + STOCK OUT
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {

                    // ✅ Save delivery item
                    const entity = qr.manager.create(RmsDeliveryItemModel, {
                        deliveryId: savedDelivery.id,
                        itemId: item.itemId,
                        deliveredQuantity: item.deliveredQuantity ?? 0,
                        notes: item.notes ?? null,
                        createdBy: data.createdBy && !isNaN(Number(data.createdBy)) ? Number(data.createdBy) : null
                    });

                    await qr.manager.save(entity);

                    // ✅ STOCK OUT
                    const stock = await stockRepo.findOne({
                        where: { itemId: item.itemId }
                    });

                    if (!stock) {
                        throw new Error(`Stock not found for item ${item.itemId}`);
                    }

                    if (stock.availableQuantity < (item.deliveredQuantity || 0)) {
                        throw new Error(`Not enough stock for item ${item.itemId}`);
                    }

                    stock.onHandQuantity -= item.deliveredQuantity || 0;
                    stock.availableQuantity -= item.deliveredQuantity || 0;

                    await stockRepo.save(stock);
                }
            }

            await qr.commitTransaction();

            return {
                ...savedDelivery,
                items: data.items || [],
                deliveryStatus: (savedDelivery.deliveryStatus || 'pending') as "pending" | "delivered" | "cancelled"
            } as IRmsDelivery;

        } catch (error) {
            await qr.rollbackTransaction();
            console.error("Create delivery failed:", error);
            throw error;
        } finally {
            await qr.release();
        }
    }

    // ✅ GET ALL
    public async getAll(searchStr: string, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const params: any[] = [];
        let whereSQL = "";

        if (searchStr) {
            whereSQL = `
                WHERE d."deliveryNumber" ILIKE $1
                OR d."companyName" ILIKE $1
            `;
            params.push(`%${searchStr}%`);
        }

        const query = `
            SELECT
                d.id,
                d."deliveryNumber",
                d."quotationId",
                d."companyName",
                d."companyEmail",
                d.notes,
                d."deliveryStatus",
                d."createdBy",
                d."updatedBy",
                d.created_at,
                d.updated_at,
                u."empId" as "createdByEmpId",
                u2."empId" as "updatedByEmpId"
            FROM public.rms_deliveries d
            LEFT JOIN public.users u ON d."createdBy" = u."userId"
            LEFT JOIN public.users u2 ON d."updatedBy" = u2."userId"
            ${whereSQL}
            ORDER BY d.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const data = await AppDataSource.query(query, [...params, limit, offset]);

        const countResult = await AppDataSource.query(
            `SELECT COUNT(*) FROM rms_deliveries`
        );

        const total = parseInt(countResult[0].count, 10);

        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    // ✅ EDIT (single with items)
    public async edit(id: number): Promise<any> {
        const query = `
            SELECT
                d.id,
                d."deliveryNumber",
                d."quotationId",
                d."companyName",
                d."companyEmail",
                d.notes,
                d."deliveryStatus",
                d.created_at AS "createdAt",
                d.updated_at AS "updatedAt",
                di."itemId",
                i."itemName",
                i."itemType",
                i."itemModel",
                i."itemConfigurations",
                di."deliveredQuantity",
                di.notes as "deliveryNotes"
            FROM rms_deliveries d
            LEFT JOIN rms_delivery_items di ON di."deliveryId" = d.id
            LEFT JOIN rms_items i ON i.id = di."itemId"
            WHERE d.id = $1
        `;

        const rows = await AppDataSource.query(query, [id]);

        if (!rows.length) return null;

        // Group data
        const delivery = {
            id: rows[0].id,
            deliveryNumber: rows[0].deliveryNumber,
            quotationId: rows[0].quotationId,
            companyName: rows[0].companyName,
            companyEmail: rows[0].companyEmail,
            notes: rows[0].notes,
            deliveryStatus: rows[0].deliveryStatus,
            items: rows.map((r: any) => ({
                itemId: r.itemId,
                itemName: r.itemName,
                itemType: r.itemType,
                itemModel: r.itemModel,
                itemConfigurations: r.itemConfigurations,
                deliveredQuantity: Number(r.deliveredQuantity) || 0,
                deliveryNotes: r.deliveryNotes
            }))
        };

        return delivery;
    }

    // ✅ UPDATE (Parent + Replace Items)
    public async update(
        id: number,
        data: Partial<IRmsDelivery>,
        items: IRmsDeliveryItem[]
    ): Promise<any> {

        const qr = AppDataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            const stockRepo = qr.manager.getRepository(RmsItemStockModel);

            // 👉 1. GET OLD ITEMS
            const oldItems = await qr.manager.find(RmsDeliveryItemModel, {
                where: { deliveryId: id }
            });

            // 👉 2. REVERSE OLD STOCK
            for (const old of oldItems) {
                const stock = await stockRepo.findOne({
                    where: { itemId: old.itemId }
                });

                if (stock) {
                    stock.onHandQuantity += old.deliveredQuantity || 0;
                    stock.availableQuantity += old.deliveredQuantity || 0;

                    await stockRepo.save(stock);
                }
            }

            // 👉 3. DELETE OLD ITEMS
            await qr.manager.delete(RmsDeliveryItemModel, { deliveryId: id });

            // 👉 4. UPDATE DELIVERY
            await qr.manager.update(RmsDeliveryModel, id, {
                companyName: data.companyName,
                companyEmail: data.companyEmail,
                notes: data.notes,
                deliveryStatus: data.deliveryStatus,
                updatedBy: data.updatedBy
            });

            // 👉 5. INSERT NEW ITEMS + STOCK OUT AGAIN
            for (const item of items) {

                const entity = qr.manager.create(RmsDeliveryItemModel, {
                    deliveryId: id,
                    itemId: item.itemId,
                    deliveredQuantity: item.deliveredQuantity || 0,
                    notes: item.notes ?? null,
                    createdBy: data.updatedBy
                });

                await qr.manager.save(entity);

                const stock = await stockRepo.findOne({
                    where: { itemId: item.itemId }
                });

                if (!stock) {
                    throw new Error(`Stock not found for item ${item.itemId}`);
                }

                if (stock.availableQuantity < (item.deliveredQuantity || 0)) {
                    throw new Error(`Not enough stock for item ${item.itemId}`);
                }

                stock.onHandQuantity -= item.deliveredQuantity || 0;
                stock.availableQuantity -= item.deliveredQuantity || 0;

                await stockRepo.save(stock);
            }

            await qr.commitTransaction();

            return {
                status: true,
                message: "Delivery updated successfully"
            };

        } catch (error) {
            await qr.rollbackTransaction();
            console.error("Update delivery failed:", error);
            throw error;
        } finally {
            await qr.release();
        }
    }

    // ✅ GET DATA BY QUOTATION ID
    public async getDataByQuotationId(quotationId: number): Promise<any> {
        const query = `
            SELECT
                q.id as "quotationId",
                q."refNumber",
                q."companyName",
                q."companyEmail",
                qi."itemId",
                i."itemName",
                i."itemType",
                i."itemModel",
                i."itemConfigurations",
                qi.quarterly as "quotedQuantity",
                qi."rmsPrice"
            FROM rms_quotation q
            LEFT JOIN rms_quotation_items qi ON qi."quotationId" = q.id
            LEFT JOIN rms_items i ON i.id = qi."itemId"
            WHERE q.id = $1
        `;

        return await AppDataSource.query(query, [quotationId]);
    }

    // ✅ DELETE
    public async delete(id: number): Promise<boolean> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Delete items first
            await queryRunner.manager.delete(RmsDeliveryItemModel, {
                deliveryId: id
            });

            // Delete delivery
            const result = await queryRunner.manager.delete(RmsDeliveryModel, id);

            await queryRunner.commitTransaction();

            return result.affected ? result.affected > 0 : false;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Delete delivery failed:", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}