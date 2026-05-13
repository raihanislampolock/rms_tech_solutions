import { AppDataSource } from "../../../init";
import {
    IRmsInvoice,
    IRmsInvoiceItem,
    IRmsInvoiceRepository
} from "../interfaces/rms.invoice.interface";
import { RmsInvoiceModel } from "../models/rms.invoice.model";
import { RmsInvoiceItemModel } from "../models/rms.invoice.item.model";
import { RmsItemStockModel } from "../models/rms.itemstock.model";
import { DeepPartial } from "typeorm";

export class RmsInvoiceRepository implements IRmsInvoiceRepository {

    private invoiceRepo = AppDataSource.getRepository(RmsInvoiceModel);
    private itemRepo = AppDataSource.getRepository(RmsInvoiceItemModel);

    // ✅ CREATE (Parent + Items)
    public async create(
        data: Partial<IRmsInvoice>,
        updateStock: boolean = true
    ): Promise<IRmsInvoice> {
        const qr = AppDataSource.createQueryRunner();

        await qr.connect();
        await qr.startTransaction();

        try {
            // ========================
            // 1. CREATE INVOICE HEADER
            // ========================
            const invoiceData: DeepPartial<RmsInvoiceModel> = {
                invoiceNumber: data.invoiceNumber!,
                quotationId: data.quotationId
                    ? Number(data.quotationId)
                    : undefined,
                challanId: data.challanId
                    ? Number(data.challanId)
                    : undefined,
                companyName: data.companyName!,
                companyEmail: data.companyEmail ?? undefined,
                notes: data.notes ?? undefined,
                invoiceStatus: data.invoiceStatus ?? 'pending',
                taxAmount: Number(data.taxAmount || 0),
                discountAmount: Number(data.discountAmount || 0),

                // Support both totalAmount and grandTotal
                totalAmount: Number(
                    data.totalAmount || data.grandTotal || 0
                ),

                createdBy: data.createdBy
            };

            const invoiceEntity = qr.manager.create(
                RmsInvoiceModel,
                invoiceData
            );

            const savedInvoice = await qr.manager.save(
                RmsInvoiceModel,
                invoiceEntity
            );

            // ========================
            // 2. HANDLE ITEMS + STOCK
            // ========================
            const savedItems: IRmsInvoiceItem[] = [];
            const stockRepo = qr.manager.getRepository(
                RmsItemStockModel
            );

            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    const qty = Number(item.quantity || 0);

                    // ========================
                    // VALIDATION
                    // ========================
                    if (!item.itemId) {
                        throw new Error("Item ID is required");
                    }

                    if (qty <= 0) {
                        throw new Error(
                            `Invalid quantity for item ${item.itemId}`
                        );
                    }

                    // ========================
                    // STOCK CHECK (OPTIONAL)
                    // ========================
                    let stock: RmsItemStockModel | null = null;

                    if (updateStock) {
                        stock = await stockRepo.findOne({
                            where: {
                                itemId: Number(item.itemId)
                            }
                        });

                        if (!stock) {
                            throw new Error(
                                `Stock not found for item ${item.itemId}`
                            );
                        }

                        if (stock.availableQuantity < qty) {
                            throw new Error(
                                `Not enough stock for item ${item.itemId}. Available: ${stock.availableQuantity}, Required: ${qty}`
                            );
                        }
                    }

                    // ========================
                    // CREATE INVOICE ITEM
                    // ========================
                    const itemData: DeepPartial<RmsInvoiceItemModel> = {
                        invoiceId: savedInvoice.id,
                        itemId: Number(item.itemId),
                        quantity: qty,
                        unitPrice: Number(item.unitPrice || 0),
                        totalPrice: Number(item.totalPrice || 0),
                        itemDiscountAmount: Number(
                            item.itemDiscountAmount || 0
                        ),
                        notes: item.notes ?? undefined,
                        createdBy: data.createdBy
                    };

                    const itemEntity = qr.manager.create(
                        RmsInvoiceItemModel,
                        itemData
                    );

                    const savedItem = await qr.manager.save(
                        RmsInvoiceItemModel,
                        itemEntity
                    );

                    savedItems.push({
                        id: savedItem.id,
                        invoiceId: savedInvoice.id,
                        itemId: Number(item.itemId),
                        quantity: qty,
                        unitPrice: Number(item.unitPrice || 0),
                        totalPrice: Number(item.totalPrice || 0),
                        itemDiscountAmount: Number(
                            item.itemDiscountAmount || 0
                        ),
                        notes: item.notes ?? undefined
                    });

                    // ========================
                    // STOCK OUT (OPTIONAL)
                    // ========================
                    if (updateStock && stock) {
                        stock.onHandQuantity -= qty;
                        stock.availableQuantity -= qty;

                        await stockRepo.save(stock);
                    }
                }
            }

            // ========================
            // 3. COMMIT TRANSACTION
            // ========================
            await qr.commitTransaction();

            return {
                ...savedInvoice,
                items: savedItems
            } as IRmsInvoice;

        } catch (error) {
            // ========================
            // ROLLBACK
            // ========================
            await qr.rollbackTransaction();
            console.error("Create invoice failed:", error);
            throw error;
        } finally {
            // ========================
            // RELEASE QUERY RUNNER
            // ========================
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
                WHERE i."invoiceNumber" ILIKE $1
                OR i."companyName" ILIKE $1
            `;
            params.push(`%${searchStr}%`);
        }

        const query = `
             SELECT
                i.id,
                i."invoiceNumber",
                i."companyName",
                i."companyEmail",
                i."invoiceStatus",
                i.notes as "invoiceNotes",
                ii."itemId",
                ii."quantity" as "deliveredQuantity",
                ii."unitPrice",
                ii."totalPrice",
                ii.notes as "itemNotes",
                it."itemName",
                it."itemType",
                it."itemModel",
                it."itemConfigurations",
                i."createdAt",
                i."updatedAt",
                u.username,
                u."empId" as "createdBy",
                u2."empId" as "updatedBy"
            FROM public.rms_invoices i
            LEFT JOIN public.rms_invoice_items ii ON i.id = ii."invoiceId"
            LEFT JOIN public.rms_items it ON ii."itemId" = it.id
            LEFT JOIN public.users u ON i."createdBy" = u."userId"
            LEFT JOIN public.users u2 ON i."updatedBy" = u2."userId"
            ${whereSQL}
            ORDER BY i."createdAt" DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        params.push(limit, offset);

        const data = await AppDataSource.query(query, params);

        // Total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM public.rms_invoices i
            ${whereSQL.replace('$1', '$' + (params.length + 1))}
        `;

        const countParams = params.slice(0, -2);
        if (searchStr) countParams.push(`%${searchStr}%`);

        const countResult = await AppDataSource.query(countQuery, countParams);
        const total = parseInt(countResult[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        return {
            data,
            total,
            totalPages,
            currentPage: page
        };
    }

    // ✅ EDIT
    public async edit(id: number): Promise<IRmsInvoice | null> {

        const query = `
            SELECT
                i.id,
                i."invoiceNumber",
                i."companyName",
                i."companyEmail",
                i."invoiceStatus",
                i.notes as "invoiceNotes",
                i."taxAmount",
                i."discountAmount",
                ii."itemId",
                ii."quantity",
                ii."unitPrice",
                ii."totalPrice",
                ii."itemDiscountAmount",
                ii.notes as "itemNotes",
                it."itemName",
                it."itemType",
                it."itemModel",
                it."itemConfigurations",
                i."createdAt",
                i."updatedAt",
                u.username,
                u."empId" as "createdBy",
                u2."empId" as "updatedBy"
            FROM public.rms_invoices i
            LEFT JOIN public.rms_invoice_items ii ON i.id = ii."invoiceId"
            LEFT JOIN public.rms_items it ON ii."itemId" = it.id
            LEFT JOIN public.users u ON i."createdBy" = u."userId"
            LEFT JOIN public.users u2 ON i."updatedBy" = u2."userId"
            WHERE i.id = $1
        `;

        const result = await AppDataSource.query(query, [id]);

        if (!result.length) return null;

        const invoice: any = {
            id: result[0].id,
            invoiceNumber: result[0].invoiceNumber,
            companyName: result[0].companyName,
            companyEmail: result[0].companyEmail,
            invoiceStatus: result[0].invoiceStatus,
            invoiceNotes: result[0].invoiceNotes,
            taxAmount: result[0].taxAmount,
            discountAmount: result[0].discountAmount,
            createdAt: result[0].createdAt,
            updatedAt: result[0].updatedAt,
            username: result[0].username,
            createdBy: result[0].createdBy,
            updatedBy: result[0].updatedBy,
            items: []
        };

        console.log(invoice.taxAmount);

        for (const row of result) {
            if (row.itemId) {
                invoice.items.push({
                    itemId: row.itemId,
                    itemName: row.itemName,
                    itemType: row.itemType,
                    itemModel: row.itemModel,
                    itemConfigurations: row.itemConfigurations,
                    quantity: row.quantity,
                    unitPrice: row.unitPrice,
                    totalPrice: row.totalPrice,
                    itemDiscountAmount: row.itemDiscountAmount,
                    itemDiscountPercent: row.itemDiscountPercent,
                    itemNotes: row.itemNotes
                });
            }
        }

        return invoice;
    }

    // ✅ UPDATE
    public async update(
        id: number,
        data: Partial<IRmsInvoice>,
        items: IRmsInvoiceItem[]
    ): Promise<any> {
        const qr = AppDataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            // Calculate totals
            let totalAmount = 0;
            items.forEach(item => {
                item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
                totalAmount += item.totalPrice;
            });

            // Update invoice
            await qr.manager.update(RmsInvoiceModel, id, {
                invoiceNumber: data.invoiceNumber,
                quotationId: data.quotationId,
                challanId: data.challanId,
                companyName: data.companyName,
                companyEmail: data.companyEmail,
                notes: data.notes,
                invoiceStatus: data.invoiceStatus,
                totalAmount,
                taxAmount: data.taxAmount ?? 0,
                discountAmount: data.discountAmount ?? 0,
                updatedBy: data.updatedBy
            });

            // Delete existing items
            await qr.manager.delete(RmsInvoiceItemModel, { invoiceId: id });

            // Add new items
            for (const item of items) {
                const entity = qr.manager.create(RmsInvoiceItemModel, {
                    invoiceId: id,
                    itemId: item.itemId,
                    quantity: item.quantity ?? 0,
                    unitPrice: item.unitPrice ?? 0,
                    totalPrice: item.totalPrice ?? 0,
                    notes: item.notes ?? undefined,
                    createdBy: data.updatedBy
                });

                await qr.manager.save(entity);
            }

            await qr.commitTransaction();

            return true;

        } catch (error) {
            await qr.rollbackTransaction();
            console.error("Update invoice failed:", error);
            throw error;
        } finally {
            await qr.release();
        }
    }


    // ✅ GET DATA BY QUOTATION ID
    public async getDataByQuotationId(refNumber: string): Promise<any> {
        const query = `
            SELECT
                q.id,
                q."refNumber",
                q."companyName",
                q."companyEmail",
                q.subject,
                q.discriptions,
                qi."itemId",
                qi.quarterly,
                qi."rmsPrice",
                i."itemName",
                i."itemPrice",
                i."itemModel",
                i."itemType",
                i."itemConfigurations",
                COALESCE(ris."availableQuantity", 0) AS "availableStock"
            FROM public.rms_quotation q
            JOIN public.rms_quotation_items qi
                ON q.id = qi."quotationId"
            JOIN public.rms_items i
                ON qi."itemId" = i.id
            LEFT JOIN public.rms_item_stocks ris
                ON i.id = ris."itemId"
            WHERE q.id::text = $1
               OR q."refNumber" = $1
        `;

        return await AppDataSource.query(query, [refNumber]);
    }

    // ✅ GET DATA BY CHALLAN ID
    public async getDataByChallanNumber(challanNumber: string): Promise<any> {
        const query = `
            select
                c.id,
                c."challanNumber",
                c."companyName",
                c."companyEmail",
                c."challanStatus",
                c."quotationId",
                ci."itemId",
                ci."deliveredQuantity",
                i."itemName",
                i."itemPrice",
                i."itemModel",
                i."itemType",
                i."itemConfigurations",
                COALESCE(rs."availableQuantity", 0) AS "availableStock"
                from public.rms_challans c
                left join public.rms_challan_items ci on c.id = ci."challanId"
                left join public.rms_items i on ci."itemId" = i.id
                left join public.rms_item_stocks rs on i.id = rs."itemId"
            WHERE c."challanNumber" = $1
        `;

        return await AppDataSource.query(query, [challanNumber]);
    }
}