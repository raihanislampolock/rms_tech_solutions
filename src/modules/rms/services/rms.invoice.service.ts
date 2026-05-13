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

    public async getQuotationForInvoice(refNumber: string): Promise<any> {
        const quotationData = await this.rmsInvoiceRepository.getDataByQuotationId(refNumber);

        if (!quotationData.length) {
            throw new Error("Quotation not found");
        }

        const firstRow = quotationData[0];

        return {
            quotationId: firstRow.id,
            invoiceNumber: await this.generateInvoiceNumber(firstRow.invoiceNumber),
            refNumber: firstRow.refNumber,
            companyName: firstRow.companyName,
            companyEmail: firstRow.companyEmail,
            subject: firstRow.subject,
            discriptions: firstRow.discriptions,
            items: quotationData.map((item: any) => ({
                itemId: item.itemId,
                itemName: item.itemName,
                itemType: item.itemType,
                itemModel: item.itemModel,
                itemConfigurations: item.itemConfigurations,
                unitPrice: item.rmsPrice,
                quotationQuantity: Number(item.quarterly || 0),
                availableStock: Number(item.availableStock || 0),
                notes: ''
            }))
        };
    }

    // ✅ CREATE FROM CHALLAN
    public async createFromChallan(challanNumber: string): Promise<any> {
        const challanData = await this.rmsInvoiceRepository.getDataByChallanNumber(challanNumber);

        if (!challanData.length) {
            throw new Error("Challan not found");
        }

        const firstRow = challanData[0];

        return {
            challanId: firstRow.id,
            invoiceNumber: await this.generateInvoiceNumber(firstRow.invoiceNumber),
            challanNumber: firstRow.challanNumber,
            companyName: firstRow.companyName,
            companyEmail: firstRow.companyEmail,
            subject: firstRow.subject,
            discriptions: firstRow.discriptions,
            items: challanData.map((item: any) => ({
                itemId: item.itemId,
                itemName: item.itemName,
                itemType: item.itemType,
                itemModel: item.itemModel,
                itemConfigurations: item.itemConfigurations,
                unitPrice: item.rmsPrice,
                deliveredQuantity: Number(item.deliveredQuantity || 0),
                availableStock: Number(item.availableStock || 0),
                notes: ''
            }))
        };
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
    public async getItemDropdown(): Promise<any[]> {
        try {
            const query = `
                SELECT
                    i.id,
                    i."itemName",
                    i."itemPrice",
                    i."itemModel",
                    i."itemType",
                    i."itemConfigurations",
                    COALESCE(s."availableQuantity", 0) AS "availableStock",
                    CONCAT(
                        i."itemName",' | ',
                        i."itemPrice",' | ',
                        i."itemModel",' | ',
                        COALESCE(i."itemConfigurations",''),' | Stock: ',
                        COALESCE(s."availableQuantity", 0)
                    ) AS label
                FROM public.rms_items i
                LEFT JOIN public.rms_item_stocks s
                    ON s."itemId" = i.id
                ORDER BY i."itemName";
            `;

            return await AppDataSource.query(query);
        } catch (error) {
            console.error("Error loading invoice dropdown:", error);
            throw new Error("Failed to load dropdown");
        }
    }

    // ✅ GENERATE PDF
    public async generatePdf(id: number): Promise<{ pdfBuffer: Buffer }> {

        try {
            const invoice = await this.edit(id); // Assumes this method exists in your class
            if (!invoice) throw new Error("Invoice not found");

            const items = invoice.items || [];
            const pdfDoc = await PDFDocument.create();

            // Load Assets
            const headerImageBytes = fs.readFileSync('src/public/dist/img/header.png');
            const footerImageBytes = fs.readFileSync('src/public/dist/img/footer.png');
            const headerImage = await pdfDoc.embedPng(headerImageBytes);
            const footerImage = await pdfDoc.embedPng(footerImageBytes);

            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Constants & Styling
            const pageWidth = 595;
            const pageHeight = 842;
            const margin = 50;
            const accentColor = rgb(0.01, 0.27, 0.58); // Professional Navy Blue
            const lightGray = rgb(0.96, 0.96, 0.98);
            const borderGray = rgb(0.85, 0.85, 0.85);

            let page = pdfDoc.addPage([pageWidth, pageHeight]);
            let y = pageHeight;

            // =========================
            // HELPERS
            // =========================
            const drawText = (text: string, x: number, yPos: number, size = 10, f = font, color = rgb(0, 0, 0)) => {
                page.drawText(String(text || ''), { x, y: yPos, size, font: f, color });
            };

            const wrapText = (text: string, maxWidth: number, size: number): string[] => {
                const words = String(text).split(' ');
                const lines: string[] = [];
                let line = '';
                for (const word of words) {
                    const testLine = line ? `${line} ${word}` : word;
                    if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
                        lines.push(line);
                        line = word;
                    } else { line = testLine; }
                }
                if (line) lines.push(line);
                return lines;
            };

            const addHeader = () => {
                page.drawImage(headerImage, { x: 0, y: pageHeight - 110, width: pageWidth, height: 110 });
                y = pageHeight - 145;

                // Invoice Title & Modern Accent
                page.drawRectangle({ x: margin, y, width: 3, height: 25, color: accentColor });
                drawText("INVOICE", margin + 12, y + 5, 22, bold, accentColor);

                // Invoice Meta Info (Right Aligned)
                const metaX = 400;
                drawText(`Invoice No:`, metaX, y + 10, 10, bold);
                drawText(invoice.invoiceNumber, metaX + 65, y + 10, 10);
                drawText(`Date:`, metaX, y - 5, 10, bold);
                drawText(new Date().toLocaleDateString(), metaX + 65, y - 5, 10);

                y -= 50;

                // Billing Info
                drawText("BILL TO", margin, y, 10, bold, rgb(0.4, 0.4, 0.4));
                y -= 15;
                drawText(invoice.companyName, margin, y, 12, bold);
                drawText(invoice.companyEmail || '', margin, y - 14, 10);

                y -= 45;
            };

            const addFooter = () => {
                page.drawImage(footerImage, { x: 0, y: 0, width: pageWidth, height: 70 });
            };

            const col = {
                sl: margin,
                item: margin + 35,
                qty: margin + 210,
                unit: margin + 270,
                discount: margin + 340,
                total: margin + 420
            };

            const drawTableHeader = () => {
                page.drawRectangle({
                    x: margin, y: y - 5, width: pageWidth - margin * 2, height: 25, color: accentColor
                });
                const ty = y + 5;
                const hColor = rgb(1, 1, 1);
                drawText("SL", col.sl + 5, ty, 10, bold, hColor);
                drawText("Item Description", col.item, ty, 10, bold, hColor);
                drawText("Qty", col.qty, ty, 10, bold, hColor);
                drawText("Unit", col.unit, ty, 10, bold, hColor);
                drawText("Discount", col.discount, ty, 10, bold, hColor);
                drawText("Total", col.total, ty, 10, bold, hColor);
                y -= 35;
            };

            // Initialize First Page
            addHeader();
            drawTableHeader();

            let subtotal = 0;
            let itemDiscountTotal = 0;

            // =========================
            // ITEMS LOOP
            // =========================
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const qty = Number(item.quantity || 0);
                const unit = Number(item.unitPrice || 0);
                const total = Number(item.totalPrice || 0);
                const discount = Number(item.itemDiscountAmount || 0);
                const lineTotal = total - discount;

                subtotal += total;
                itemDiscountTotal += discount;

                const itemLines = wrapText(item.itemName || '', 160, 9);
                const rowHeight = Math.max(itemLines.length * 14, 30);

                if (y - rowHeight < 150) {
                    addFooter();
                    page = pdfDoc.addPage([pageWidth, pageHeight]);
                    addHeader();
                    drawTableHeader();
                }

                // Zebra Stripping
                if (i % 2 === 1) {
                    page.drawRectangle({
                        x: margin, y: y - rowHeight + 10, width: pageWidth - (margin * 2), height: rowHeight, color: lightGray
                    });
                }

                drawText(String(i + 1), col.sl + 8, y - 2, 9);
                itemLines.forEach((line, idx) => drawText(line, col.item, y - 2 - (idx * 12), 9));
                drawText(qty.toString(), col.qty, y - 2, 9);
                drawText(unit.toFixed(2), col.unit, y - 2, 9);
                drawText(discount.toFixed(2), col.discount, y - 2, 9);
                drawText(lineTotal.toFixed(2), col.total, y - 2, 9);

                y -= rowHeight;
            }

            // Calculations
            const overallDiscount = Number(invoice.discountAmount || 0);
            const tax = Number(invoice.taxAmount || 0);
            const grandTotal = (subtotal - overallDiscount) + tax;

            // =========================
            // SUMMARY SECTION (Right Aligned)
            // =========================
            y -= 20;
            const summaryX = 350;
            const valueX = pageWidth - margin - 5;

            const drawSummaryRow = (label: string, value: number, isTotal = false) => {
                const fontSize = isTotal ? 12 : 10;
                const f = isTotal ? bold : font;
                drawText(label, summaryX, y, fontSize, f);
                const valStr = value.toFixed(2);
                const valWidth = f.widthOfTextAtSize(valStr, fontSize);
                drawText(valStr, valueX - valWidth, y, fontSize, f);
                y -= 18;
            };

            drawSummaryRow("Subtotal", subtotal);
            // drawSummaryRow("Item Discount", -itemDiscountTotal);
            drawSummaryRow("Overall Discount", -overallDiscount);
            drawSummaryRow("Tax", tax);

            page.drawLine({
                start: { x: summaryX, y: y + 5 },
                end: { x: valueX, y: y + 5 },
                thickness: 1, color: borderGray
            });

            y -= 10;
            drawSummaryRow("GRAND TOTAL", grandTotal, true);

            // =========================
            // SIGNATURES
            // =========================
            const sigY = 120;
            page.drawLine({ start: { x: margin, y: sigY + 20 }, end: { x: pageWidth - margin, y: sigY + 20 }, thickness: 0.5, color: borderGray });

            drawText("Prepared By", margin, sigY, 9, bold);
            drawText(invoice.username || "System User", margin, sigY - 15, 9);

            drawText("Authorized Signature", 400, sigY, 9, bold);
            drawText("RMS Technologies", 400, sigY - 15, 9);

            addFooter();

            const pdfBytes = await pdfDoc.save();
            return { pdfBuffer: Buffer.from(pdfBytes) };

        } catch (error) {
            console.error("Invoice PDF Error:", error);
            throw new Error("Failed to generate invoice PDF");
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