import { AppDataSource } from "../../../init";
import {
    IRmsInvoice,
    IRmsInvoiceItem,
    IRmsInvoiceRepository
} from "../interfaces/rms.invoice.interface";
import { RmsInvoiceModel } from "../models/rms.invoice.model";
import { RmsInvoiceItemModel } from "../models/rms.invoice.item.model";

export class RmsInvoiceRepository implements IRmsInvoiceRepository {

    private invoiceRepo = AppDataSource.getRepository(RmsInvoiceModel);
    private itemRepo = AppDataSource.getRepository(RmsInvoiceItemModel);

    // ✅ CREATE (Parent + Items)
    public async create(data: Partial<IRmsInvoice>): Promise<IRmsInvoice> {
        const qr = AppDataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            // Calculate totals
            let totalAmount = 0;
            if (data.items) {
                data.items.forEach(item => {
                    item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
                    totalAmount += item.totalPrice;
                });
            }

            // 👉 1. Save invoice
            const invoice = qr.manager.create(RmsInvoiceModel, {
                invoiceNumber: data.invoiceNumber,
                quotationId: data.quotationId ?? null,
                challanId: data.challanId ?? null,
                companyName: data.companyName,
                companyEmail: data.companyEmail ?? null,
                notes: data.notes ?? null,
                invoiceStatus: data.invoiceStatus ?? 'pending',
                totalAmount,
                taxAmount: data.taxAmount ?? 0,
                discountAmount: data.discountAmount ?? 0,
                createdBy: data.createdBy && !isNaN(Number(data.createdBy)) ? Number(data.createdBy) : null,
            });

            const savedInvoice = await qr.manager.save(invoice);

            // 👉 2. Save items
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    const entity = qr.manager.create(RmsInvoiceItemModel, {
                        invoiceId: savedInvoice.id,
                        itemId: item.itemId,
                        quantity: item.quantity ?? 0,
                        unitPrice: item.unitPrice ?? 0,
                        totalPrice: item.totalPrice ?? 0,
                        notes: item.notes ?? null,
                        createdBy: data.createdBy && !isNaN(Number(data.createdBy)) ? Number(data.createdBy) : null
                    });

                    await qr.manager.save(entity);
                }
            }

            await qr.commitTransaction();

            return {
                ...savedInvoice,
                items: data.items || [],
                invoiceStatus: (savedInvoice.invoiceStatus || 'pending') as "pending" | "cancelled" | "paid"
            } as IRmsInvoice;

        } catch (error) {
            await qr.rollbackTransaction();
            console.error("Create invoice failed:", error);
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
                WHERE i."invoiceNumber" ILIKE $1
                OR i."companyName" ILIKE $1
            `;
            params.push(`%${searchStr}%`);
        }

        const query = `
            SELECT
                i.id,
                i."invoiceNumber",
                i."quotationId",
                i."challanId",
                i."companyName",
                i."companyEmail",
                i.notes,
                i."invoiceStatus",
                i."totalAmount",
                i."taxAmount",
                i."discountAmount",
                i."createdBy",
                i."created_at",
                i."updated_at",
                COALESCE(json_agg(
                    json_build_object(
                        'id', ii.id,
                        'invoiceId', ii."invoiceId",
                        'itemId', ii."itemId",
                        'quantity', ii."quantity",
                        'unitPrice', ii."unitPrice",
                        'totalPrice', ii."totalPrice",
                        'notes', ii.notes,
                        'createdBy', ii."createdBy",
                        'createdAt', ii."created_at",
                        'updatedAt', ii."updated_at"
                    )
                ) FILTER (WHERE ii.id IS NOT NULL), '[]') AS items
            FROM public.rms_invoices i
            LEFT JOIN public.rms_invoice_items ii ON i.id = ii."invoiceId"
            ${whereSQL}
            GROUP BY i.id
            ORDER BY i."created_at" DESC
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
                i."quotationId",
                i."challanId",
                i."companyName",
                i."companyEmail",
                i.notes,
                i."invoiceStatus",
                i."totalAmount",
                i."taxAmount",
                i."discountAmount",
                i."createdBy",
                i."created_at",
                i."updated_at",
                COALESCE(json_agg(
                    json_build_object(
                        'id', ii.id,
                        'invoiceId', ii."invoiceId",
                        'itemId', ii."itemId",
                        'quantity', ii."quantity",
                        'unitPrice', ii."unitPrice",
                        'totalPrice', ii."totalPrice",
                        'notes', ii.notes,
                        'createdBy', ii."createdBy",
                        'createdAt', ii."created_at",
                        'updatedAt', ii."updated_at",
                        'itemName', it."itemName",
                        'itemPrice', it."itemPrice",
                        'itemModel', it."itemModel",
                        'itemConfigurations', it."itemConfigurations"
                    )
                ) FILTER (WHERE ii.id IS NOT NULL), '[]') AS items
            FROM public.rms_invoices i
            LEFT JOIN public.rms_invoice_items ii ON i.id = ii."invoiceId"
            LEFT JOIN public.rms_items it ON ii."itemId" = it.id
            WHERE i.id = $1
            GROUP BY i.id
        `;

        const result = await AppDataSource.query(query, [id]);

        if (result.length === 0) {
            return null;
        }

        return result[0];
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
                    notes: item.notes ?? null,
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

    // ✅ DELETE
    public async delete(id: number): Promise<boolean> {
        const qr = AppDataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            // Delete items and invoice
            await qr.manager.delete(RmsInvoiceItemModel, { invoiceId: id });
            await qr.manager.delete(RmsInvoiceModel, id);

            await qr.commitTransaction();

            return true;

        } catch (error) {
            await qr.rollbackTransaction();
            console.error("Delete invoice failed:", error);
            throw error;
        } finally {
            await qr.release();
        }
    }

    // ✅ GET DATA BY QUOTATION ID
    public async getDataByQuotationId(quotationId: number): Promise<any> {
        const query = `
            SELECT
                q."refNumber",
                q."companyName",
                q."companyEmail",
                qi."itemId",
                qi."quotedQuantity",
                qi."quotedPrice",
                i."itemName",
                i."itemPrice",
                i."itemModel",
                i."itemConfigurations"
            FROM public.rms_quotations q
            JOIN public.rms_quotation_items qi ON q.id = qi."quotationId"
            JOIN public.rms_items i ON qi."itemId" = i.id
            WHERE q.id = $1
        `;

        return await AppDataSource.query(query, [quotationId]);
    }

    // ✅ GET DATA BY CHALLAN ID
    public async getDataByChallanId(challanId: number): Promise<any> {
        const query = `
            SELECT
                c."challanNumber",
                c."companyName",
                c."companyEmail",
                ci."itemId",
                ci."deliveredQuantity",
                i."itemName",
                i."itemPrice",
                i."itemModel",
                i."itemConfigurations"
            FROM public.rms_challans c
            JOIN public.rms_challan_items ci ON c.id = ci."challanId"
            JOIN public.rms_items i ON ci."itemId" = i.id
            WHERE c.id = $1
        `;

        return await AppDataSource.query(query, [challanId]);
    }
}