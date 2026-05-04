import { AppDataSource } from "../../../init";
import { IRmsPurchase, IRmsPurchaseItem, IRmsPurchaseRepository, IRmsPurchaseItemRepository } from "../interfaces/rms.purchase.interface";
import { RmsPurchaseModel } from "../models/rms.purchase.model";
import { RmsPurchaseItemModel } from "../models/rms.purchase.item.model";
import { RmsStockMovementModel } from "../models/rms.stock-movement.model";
import { RmsItemsModel } from "../models/rms.items.model";
import { RmsItemStockModel } from "../models/rms.itemstock.model";

export class RmsPurchaseRepository implements IRmsPurchaseRepository {

    private purchaseRepo = AppDataSource.getRepository(RmsPurchaseModel);
    private purchaseitemRepo = AppDataSource.getRepository(RmsPurchaseItemModel);

    // ✅ CREATE (Parent + Items)
    public async create(data: any): Promise<any> {

        const qr = AppDataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {

            // 👉 1. Save Purchase
            const purchase = qr.manager.create(RmsPurchaseModel, {
                purchaseNumber: data.purchaseNumber,
                supplierName: data.supplierName,
                supplierEmail: data.supplierEmail,
                purchaseStatus: data.purchaseStatus,
                notes: data.notes,
                files: data.files,
                createdBy: data.createdBy
            });

            const savedPurchase = await qr.manager.save(purchase);

            // 👉 2. Process Items
            for (const item of data.items) {

                // 👉 Save purchase item
                const purchaseItem = qr.manager.create(RmsPurchaseItemModel, {
                    purchaseId: savedPurchase.id,
                    itemId: item.itemId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    notes: item.description || '',
                    createdBy: data.createdBy
                });

                await qr.manager.save(purchaseItem);

                // 👉 Update Item Price
                await qr.manager.update(RmsItemsModel, item.itemId, {
                    itemPrice: item.unitPrice
                });

                // 👉 Update Stock
                const stockRepo = qr.manager.getRepository(RmsItemStockModel);
                let stock = await stockRepo.findOne({ where: { itemId: item.itemId } });

                if (stock) {
                    stock.onHandQuantity += item.quantity;
                    stock.availableQuantity += item.quantity;
                    stock.lastPurchasePrice = item.unitPrice;
                    stock.lastPurchaseDate = new Date();
                } else {
                    stock = stockRepo.create({
                        itemId: item.itemId,
                        onHandQuantity: item.quantity,
                        reservedQuantity: 0,
                        availableQuantity: item.quantity,
                        lastPurchasePrice: item.unitPrice,
                        lastPurchaseDate: new Date(),
                        createdBy: data.createdBy
                    });
                }

                await stockRepo.save(stock);

                // 👉 Stock Movement
                await qr.manager.save(RmsStockMovementModel, {
                    itemId: item.itemId,
                    quantity: item.quantity,
                    movementType: "PURCHASE",
                    referenceId: savedPurchase.id,
                    note: "Purchase Created"
                });
            }

            await qr.commitTransaction();

            return {
                status: true,
                message: "Purchase created successfully",
                data: savedPurchase
            };

        } catch (err) {
            await qr.rollbackTransaction();
            throw err;
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
                WHERE p."purchaseNumber" ILIKE $1
                OR p."supplierName" ILIKE $1
                OR i."itemName" ILIKE $1
            `;
            params.push(`%${searchStr}%`);
        }

        const query = `
            SELECT
                p.id,
                p."purchaseNumber",
                p.files,
                p."supplierName",
                p."supplierEmail",
                p."purchaseStatus",
                p.notes,
                i.id AS "itemId",
                i."itemName",
                i."itemType",
                i."itemModel",
                i."itemConfigurations",
                i."manufactureOrigin",
                pi.quantity,
                pi."unitPrice",
                pi."totalPrice",
                pi.notes AS "itemNotes",
                (pi.quantity * pi."unitPrice"::numeric) AS "calculatedTotal",
                u."empId" AS "createdBy",
                u2."empId" AS "updatedBy",
                p."createdAt",
                p."updatedAt"
            FROM public.rms_purchases p
            LEFT JOIN public.rms_purchase_items pi
                ON p.id = pi."purchaseId"
            LEFT JOIN public.rms_items i
                ON pi."itemId" = i.id
            LEFT JOIN public.users u
                ON p."createdBy" = u."userId"
            LEFT JOIN public.users u2
                ON p."updatedBy" = u2."userId"
            ${whereSQL}
            ORDER BY p."createdAt" DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const data = await AppDataSource.query(query, [...params, limit, offset]);

        const countResult = await AppDataSource.query(
            `SELECT COUNT(*) FROM public.rms_purchases p
            LEFT JOIN public.rms_purchase_items pi
                ON p.id = pi."purchaseId"
            LEFT JOIN public.rms_items i
                ON pi."itemId" = i.id
            LEFT JOIN public.users u
                ON p."createdBy" = u."userId"
            LEFT JOIN public.users u2
                ON p."updatedBy" = u2."userId"`
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
                p.id,
                p."purchaseNumber",
                p.files,
                p."supplierName",
                p."supplierEmail",
                p."purchaseStatus",
                p.notes,
                p."createdAt",
                p."updatedAt",
                pi."itemId",
                i."itemName",
                i."itemType",
                i."itemModel",
                i."itemConfigurations",
                i."itemPrice",
                pi.quantity,
                pi."unitPrice",
                pi."totalPrice",
                pi.notes AS "itemNotes"
            FROM rms_purchases p
            LEFT JOIN rms_purchase_items pi
                ON pi."purchaseId" = p.id
            LEFT JOIN rms_items i
                ON i.id = pi."itemId"
            WHERE p.id = $1
        `;

        const rows = await AppDataSource.query(query, [id]);

        if (!rows.length) return null;

        // ✅ GROUP DATA (same pattern you used)
        const purchase = {
            id: rows[0].id,
            purchaseNumber: rows[0].purchaseNumber,
            supplierName: rows[0].supplierName,
            supplierEmail: rows[0].supplierEmail,
            purchaseStatus: rows[0].purchaseStatus,
            notes: rows[0].notes,
            files: rows[0].files,
            createdAt: rows[0].createdAt,
            updatedAt: rows[0].updatedAt,

            items: rows.map((r: any) => ({
                itemId: r.itemId,
                itemName: r.itemName,
                itemType: r.itemType,
                itemModel: r.itemModel,
                itemConfigurations: r.itemConfigurations,
                itemPrice: Number(r.itemPrice),   // master price
                unitPrice: Number(r.unitPrice),   // purchase price
                quantity: Number(r.quantity),
                totalPrice: Number(r.totalPrice),
                description: r.itemNotes || ''
            }))
        };

        return purchase;
    }

    // ✅ UPDATE (Parent + Replace Items)
    public async update(id: number, data: any): Promise<any> {

        const qr = AppDataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {

            // 👉 1. Get old items
            const oldItems = await qr.manager.find(RmsPurchaseItemModel, {
                where: { purchaseId: id }
            });

            const stockRepo = qr.manager.getRepository(RmsItemStockModel);

            // 👉 2. REVERSE OLD STOCK
            for (const old of oldItems) {

                const stock = await stockRepo.findOne({ where: { itemId: old.itemId } });

                if (stock) {
                    stock.onHandQuantity -= old.quantity;
                    stock.availableQuantity -= old.quantity;

                    await stockRepo.save(stock);
                }

                // 👉 movement reverse
                await qr.manager.save(RmsStockMovementModel, {
                    itemId: old.itemId,
                    quantity: -old.quantity,
                    files: null,
                    movementType: "PURCHASE_UPDATE_REVERSAL",
                    referenceId: id,
                    note: "Reversal before update"
                });
            }

            // 👉 3. Delete old items
            await qr.manager.delete(RmsPurchaseItemModel, { purchaseId: id });

            // 👉 4. Update purchase
            await qr.manager.update(RmsPurchaseModel, id, {
                supplierName: data.supplierName,
                supplierEmail: data.supplierEmail,
                purchaseStatus: data.purchaseStatus,
                notes: data.notes,
                files: data.files,
                updatedBy: data.updatedBy
            });

            // 👉 5. Insert NEW items
            for (const item of data.items) {

                const newItem = qr.manager.create(RmsPurchaseItemModel, {
                    purchaseId: id,
                    itemId: item.itemId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    notes: item.description || '',
                    createdBy: data.updatedBy
                });

                await qr.manager.save(newItem);

                // 👉 Update Item Price
                await qr.manager.update(RmsItemsModel, item.itemId, {
                    itemPrice: item.unitPrice
                });

                // 👉 Update Stock AGAIN
                let stock = await stockRepo.findOne({ where: { itemId: item.itemId } });

                if (stock) {
                    stock.onHandQuantity += item.quantity;
                    stock.availableQuantity += item.quantity;
                    stock.lastPurchasePrice = item.unitPrice;
                    stock.lastPurchaseDate = new Date();
                } else {
                    stock = stockRepo.create({
                        itemId: item.itemId,
                        onHandQuantity: item.quantity,
                        reservedQuantity: 0,
                        availableQuantity: item.quantity,
                        lastPurchasePrice: item.unitPrice,
                        lastPurchaseDate: new Date()
                    });
                }

                await stockRepo.save(stock);

                // 👉 Movement again
                await qr.manager.save(RmsStockMovementModel, {
                    itemId: item.itemId,
                    quantity: item.quantity,
                    movementType: "PURCHASE_UPDATE",
                    referenceId: id,
                    note: "After update"
                });
            }

            await qr.commitTransaction();

            return {
                status: true,
                message: "Purchase updated successfully"
            };

        } catch (err) {
            await qr.rollbackTransaction();
            throw err;
        } finally {
            await qr.release();
        }
    }
    // ✅ DROPDOWN
    public async getDataByItemId(): Promise<{ id: string; label: string }[]> {
        const query = `
            SELECT
                i.id,
                CONCAT(
                    i."itemName",' | ',
                    i."itemPrice",' | ',
                    i."itemModel",' | ',
                    COALESCE(i."itemConfigurations",'')
                ) AS label,
                i."itemPrice",
                i."itemName",
                i."itemModel",
                i."itemType",
                i."itemConfigurations"
            FROM public.rms_items i
            ORDER BY i."itemName"
        `;

        return await AppDataSource.query(query);
    }

    public async getById(id: number) {
        return await AppDataSource.getRepository(RmsPurchaseModel).findOne({
            where: { id },
            relations: ["items"]
        });
    }
}