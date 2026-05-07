import { Config } from "../../../core/Config";
import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
    IRmsInvoice,
    IRmsInvoiceItem,
    IRmsInvoiceRepository
} from "../interfaces/rms.invoice.interface";
import { AppDataSource } from "../../../init";

const APP_CONFIG: Config = new Config(
    JSON.parse(fs.readFileSync("config.json").toString())
);

export class RmsInvoiceService {
    private rmsInvoiceRepository: IRmsInvoiceRepository;

    constructor(rmsInvoiceRepository: IRmsInvoiceRepository) {
        this.rmsInvoiceRepository = rmsInvoiceRepository;
    }

    // ✅ CREATE
    public async create(data: Partial<IRmsInvoice>): Promise<IRmsInvoice> {
        try {
            return await this.rmsInvoiceRepository.create(data);
        } catch (error) {
            console.error("Error in create invoice service:", error);
            throw new Error("Failed to create invoice");
        }
    }

    // ✅ GET ALL
    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsInvoice[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        try {
            return await this.rmsInvoiceRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching invoice list:", error);
            throw new Error("Failed to fetch invoices");
        }
    }

    // ✅ EDIT
    public async edit(id: number): Promise<IRmsInvoice | null> {
        try {
            const record = await this.rmsInvoiceRepository.edit(id);
            if (!record) {
                return null;
            }
            return record;
        } catch (error) {
            console.error("Error fetching invoice:", error);
            throw new Error("Failed to fetch invoice");
        }
    }

    // ✅ UPDATE
    public async update(
        id: number,
        data: Partial<IRmsInvoice>,
        items: IRmsInvoiceItem[]
    ): Promise<any> {
        try {
            return await this.rmsInvoiceRepository.update(id, data, items);
        } catch (error) {
            console.error("Error updating invoice:", error);
            throw new Error("Failed to update invoice");
        }
    }

    // ✅ CREATE FROM QUOTATION
    public async createFromQuotation(quotationId: number, userId?: number): Promise<IRmsInvoice> {
        try {
            const quotationData = await this.rmsInvoiceRepository.getDataByQuotationId(quotationId);

            if (!quotationData.length) {
                throw new Error("Quotation not found");
            }

            const quotation = quotationData[0];
            const invoiceNumber = await this.generateInvoiceNumber(quotation.companyName);

            const invoiceItems: IRmsInvoiceItem[] = quotationData.map((item: any) => ({
                itemId: item.itemId,
                quantity: item.quotedQuantity,
                unitPrice: item.quotedPrice || item.itemPrice,
                totalPrice: (item.quotedQuantity || 0) * (item.quotedPrice || item.itemPrice || 0),
                createdBy: userId
            }));

            const totalAmount = invoiceItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

            const invoice = await this.create({
                invoiceNumber,
                quotationId,
                companyName: quotation.companyName,
                companyEmail: quotation.companyEmail,
                invoiceStatus: 'pending',
                totalAmount,
                createdBy: userId,
                items: invoiceItems
            });

            return invoice;
        } catch (error) {
            console.error("Error creating invoice from quotation:", error);
            throw new Error("Failed to create invoice from quotation");
        }
    }

    // ✅ CREATE FROM CHALLAN
    public async createFromChallan(challanId: number, userId?: number): Promise<IRmsInvoice> {
        try {
            const challanData = await this.rmsInvoiceRepository.getDataByChallanId(challanId);

            if (!challanData.length) {
                throw new Error("Challan not found");
            }

            const challan = challanData[0];
            const invoiceNumber = await this.generateInvoiceNumber(challan.companyName);

            const invoiceItems: IRmsInvoiceItem[] = challanData.map((item: any) => ({
                itemId: item.itemId,
                quantity: item.deliveredQuantity,
                unitPrice: item.itemPrice,
                totalPrice: (item.deliveredQuantity || 0) * (item.itemPrice || 0),
                createdBy: userId
            }));

            const totalAmount = invoiceItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

            const invoice = await this.create({
                invoiceNumber,
                challanId,
                companyName: challan.companyName,
                companyEmail: challan.companyEmail,
                invoiceStatus: 'pending',
                totalAmount,
                createdBy: userId,
                items: invoiceItems
            });

            return invoice;
        } catch (error) {
            console.error("Error creating invoice from challan:", error);
            throw new Error("Failed to create invoice from challan");
        }
    }

    // ✅ DELETE
    public async delete(id: number): Promise<boolean> {
        try {
            return await this.rmsInvoiceRepository.delete(id);
        } catch (error) {
            console.error("Error in delete invoice service:", error);
            throw new Error("Failed to delete invoice");
        }
    }

    // ✅ GENERATE INVOICE NUMBER
    public async generateInvoiceNumber(companyName: string): Promise<string> {
        const companyCode = companyName?.substring(0, 2).toUpperCase() || "XX";

        const refResult = await AppDataSource.query(`
            SELECT
            CONCAT(
                'INV/',
                TO_CHAR(NOW(), 'YYYYMM'),
                '/',
                $1::text,
                '-',
                LPAD(nextval('rms_invoice_seq')::text, 3, '0')
            ) AS "invoiceNumber"
        `, [companyCode]);

        return refResult[0].invoiceNumber;
    }

    // ✅ GET ITEM DROPDOWN
    public async getItemDropdown(): Promise<{ id: string; label: string }[]> {
        try {
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
        } catch (error) {
            console.error("Error loading invoice dropdown:", error);
            throw new Error("Failed to load dropdown");
        }
    }

    // ✅ GENERATE PDF
    public async generatePdf(id: number): Promise<{ pdfBuffer: Buffer; emailSent?: boolean }> {
        try {
            const invoice = await this.edit(id);
            if (!invoice) throw new Error('Invoice not found');

            const itemsWithDetails = await this.getItemsWithDetails(invoice.items || []);

            const pdfDoc = await PDFDocument.create();

            // Files
            const headerImageBytes = fs.readFileSync('src/public/dist/img/header.png');
            const footerImageBytes = fs.readFileSync('src/public/dist/img/footer.png');

            const headerImage = await pdfDoc.embedPng(headerImageBytes);
            const footerImage = await pdfDoc.embedPng(footerImageBytes);

            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Page setup
            const margin = 50;
            const lineHeight = 14;
            const BOTTOM_LIMIT = 120;

            let page = pdfDoc.addPage();
            const { width, height } = page.getSize();

            let yPosition = height - 120;

            // Header
            page.drawImage(headerImage, {
                x: margin,
                y: yPosition,
                width: 100,
                height: 50
            });

            yPosition -= 70;

            // Title
            page.drawText('INVOICE', {
                x: margin,
                y: yPosition,
                size: 18,
                font: helveticaBold,
                color: rgb(0, 0, 0)
            });

            yPosition -= 30;

            // Invoice details
            page.drawText(`Invoice Number: ${invoice.invoiceNumber}`, {
                x: margin,
                y: yPosition,
                size: 12,
                font: helvetica,
                color: rgb(0, 0, 0)
            });

            page.drawText(`Company: ${invoice.companyName}`, {
                x: width / 2,
                y: yPosition,
                size: 12,
                font: helvetica,
                color: rgb(0, 0, 0)
            });

            yPosition -= lineHeight;

            page.drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, {
                x: margin,
                y: yPosition,
                size: 12,
                font: helvetica,
                color: rgb(0, 0, 0)
            });

            page.drawText(`Status: ${invoice.invoiceStatus}`, {
                x: width / 2,
                y: yPosition,
                size: 12,
                font: helvetica,
                color: rgb(0, 0, 0)
            });

            yPosition -= 30;

            // Items table header
            const tableStartY = yPosition;
            const colWidths = [150, 80, 80, 80, 100];
            const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2], margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]];

            page.drawText('Item', { x: colX[0], y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Qty', { x: colX[1], y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Unit Price', { x: colX[2], y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Total', { x: colX[3], y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Notes', { x: colX[4], y: yPosition, size: 10, font: helveticaBold });

            yPosition -= lineHeight;

            // Items
            for (const item of itemsWithDetails) {
                if (yPosition < BOTTOM_LIMIT) {
                    // Footer
                    page.drawImage(footerImage, {
                        x: margin,
                        y: 30,
                        width: width - 2 * margin,
                        height: 50
                    });

                    page = pdfDoc.addPage();
                    yPosition = height - 120;
                }

                page.drawText(item.itemName || '', { x: colX[0], y: yPosition, size: 9, font: helvetica });
                page.drawText(item.quantity?.toString() || '', { x: colX[1], y: yPosition, size: 9, font: helvetica });
                page.drawText(item.unitPrice?.toString() || '', { x: colX[2], y: yPosition, size: 9, font: helvetica });
                page.drawText(item.totalPrice?.toString() || '', { x: colX[3], y: yPosition, size: 9, font: helvetica });
                page.drawText(item.notes || '', { x: colX[4], y: yPosition, size: 9, font: helvetica });

                yPosition -= lineHeight;
            }

            // Totals
            yPosition -= 20;
            page.drawText(`Subtotal: ${invoice.totalAmount}`, { x: width - 200, y: yPosition, size: 12, font: helveticaBold });
            yPosition -= lineHeight;
            if (invoice.taxAmount) {
                page.drawText(`Tax: ${invoice.taxAmount}`, { x: width - 200, y: yPosition, size: 12, font: helvetica });
                yPosition -= lineHeight;
            }
            if (invoice.discountAmount) {
                page.drawText(`Discount: ${invoice.discountAmount}`, { x: width - 200, y: yPosition, size: 12, font: helvetica });
                yPosition -= lineHeight;
            }
            const grandTotal = (invoice.totalAmount || 0) + (invoice.taxAmount || 0) - (invoice.discountAmount || 0);
            page.drawText(`Grand Total: ${grandTotal}`, { x: width - 200, y: yPosition, size: 12, font: helveticaBold });

            // Footer
            page.drawImage(footerImage, {
                x: margin,
                y: 30,
                width: width - 2 * margin,
                height: 50
            });

            const pdfBytes = await pdfDoc.save();

            return { pdfBuffer: Buffer.from(pdfBytes) };

        } catch (error) {
            console.error("Error generating PDF:", error);
            throw new Error("Failed to generate PDF");
        }
    }

    // Helper method to get items with details
    private async getItemsWithDetails(items: IRmsInvoiceItem[]): Promise<any[]> {
        if (!items.length) return [];

        const itemIds = items.map(item => item.itemId);
        const query = `
            SELECT
                i.id,
                i."itemName",
                i."itemPrice",
                i."itemModel",
                i."itemConfigurations"
            FROM public.rms_items i
            WHERE i.id = ANY($1)
        `;

        const itemDetails = await AppDataSource.query(query, [itemIds]);

        return items.map(item => {
            const detail = itemDetails.find((d: any) => d.id === item.itemId);
            return {
                ...item,
                ...detail
            };
        });
    }
}