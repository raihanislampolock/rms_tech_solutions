import { AppDataSource } from "../../../init";
import {
    IRmsDelivery,
    IRmsDeliveryItem,
    IRmsDeliveryRepository
} from "../interfaces/rms.delivery.interface";
import { RmsDeliveryModel } from "../models/rms.delivery.model";
import { RmsDeliveryItemModel } from "../models/rms.delivery.item.model";

export class RmsDeliveryRepository implements IRmsDeliveryRepository {

    private deliveryRepo = AppDataSource.getRepository(RmsDeliveryModel);
    private itemRepo = AppDataSource.getRepository(RmsDeliveryItemModel);

    // ✅ CREATE (Parent + Items)
    public async createDelivery(data: Partial<IRmsDelivery>): Promise<IRmsDelivery> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Save delivery
            const delivery = queryRunner.manager.create(RmsDeliveryModel, {
                deliveryNumber: data.deliveryNumber,
                quotationId: data.quotationId ?? null,
                companyName: data.companyName,
                companyEmail: data.companyEmail ?? null,
                notes: data.notes ?? null,
                deliveryStatus: data.deliveryStatus ?? 'pending',
                createdBy: data.createdBy ?? null,
            });

            const savedDelivery = await queryRunner.manager.save(delivery);

            // Save items
            if (data.items && data.items.length > 0) {
                const items = data.items.map(item => ({
                    deliveryId: savedDelivery.id,
                    itemId: item.itemId,
                    deliveredQuantity: item.deliveredQuantity ?? null,
                    notes: item.notes ?? null,
                    createdBy: data.createdBy
                }));

                const itemEntities = queryRunner.manager.create(RmsDeliveryItemModel, items);
                await queryRunner.manager.save(itemEntities);
            }

            await queryRunner.commitTransaction();

            return {
                ...savedDelivery,
                items: data.items || []
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Create delivery failed:", error);
            throw error;
        } finally {
            await queryRunner.release();
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
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Update delivery
            await queryRunner.manager.update(RmsDeliveryModel, id, {
                deliveryNumber: data.deliveryNumber,
                quotationId: data.quotationId ?? undefined,
                companyName: data.companyName,
                companyEmail: data.companyEmail ?? undefined,
                notes: data.notes ?? undefined,
                deliveryStatus: data.deliveryStatus ?? undefined,
                updatedBy: data.updatedBy ?? undefined
            });

            // Delete old items
            await queryRunner.manager.delete(RmsDeliveryItemModel, {
                deliveryId: id
            });

            // Insert new items
            if (items && items.length > 0) {
                const newItems = items.map(item => ({
                    deliveryId: id,
                    itemId: item.itemId,
                    deliveredQuantity: item.deliveredQuantity ?? null,
                    notes: item.notes ?? null,
                    createdBy: data.updatedBy
                }));

                const entities = queryRunner.manager.create(RmsDeliveryItemModel, newItems);
                await queryRunner.manager.save(entities);
            }

            await queryRunner.commitTransaction();

            return {
                status: true,
                message: "Updated successfully"
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Update delivery failed:", error);
            throw error;
        } finally {
            await queryRunner.release();
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