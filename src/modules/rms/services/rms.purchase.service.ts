import { Config } from "../../../core/Config";
import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { IRmsPurchase, IRmsPurchaseItem, IRmsPurchaseRepository } from "../interfaces/rms.purchase.interface";
import { AppDataSource } from "../../../init";
import { RmsPurchaseRepository } from "../repositories/rms.purchase.repository";

export class RmsPurchaseService {
    private rmsPurchaseRepository: RmsPurchaseRepository;

    constructor(rmsPurchaseRepository: IRmsPurchaseRepository) {
         this.rmsPurchaseRepository = new RmsPurchaseRepository();
    }

    // ===============================
    // ✅ CREATE
    // ===============================
    public async create(data: Partial<IRmsPurchase>): Promise<IRmsPurchase> {
        try {

            // ✅ VALIDATION (important)
            if (!data.purchaseNumber) {
                throw new Error("Purchase number is required");
            }

            if (!data.items || data.items.length === 0) {
                throw new Error("At least one item is required");
            }

            // 👉 Now TypeScript knows it's safe
            return await this.rmsPurchaseRepository.create(data as IRmsPurchase);

        } catch (error) {
            console.error("Create Purchase Error:", error);
            throw new Error("Failed to create purchase");
        }
    }

    // ===============================
    // ✅ GET ALL
    // ===============================
    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ) {
        try {
            return await this.rmsPurchaseRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Fetch Purchase Error:", error);
            throw new Error("Failed to fetch purchases");
        }
    }

    // ===============================
    // ✅ EDIT
    // ===============================
    public async edit(id: number): Promise<IRmsPurchase | null> {
        try {
            return await this.rmsPurchaseRepository.edit(id);
        } catch (error) {
            console.error("Edit Purchase Error:", error);
            throw new Error("Failed to fetch purchase");
        }
    }

    // ===============================
    // 🔥 UPDATE (REPO HANDLES STOCK)
    // ===============================
    public async update(
        id: number,
        data: Partial<IRmsPurchase>,
        items: IRmsPurchaseItem[]
    ): Promise<any> {
        try {

            // 🔥 Merge items into data (important)
            const payload = {
                ...data,
                items
            };

            return await this.rmsPurchaseRepository.update(id, payload);

        } catch (error) {
            console.error("Update Purchase Error:", error);
            throw new Error("Failed to update purchase");
        }
    }


    // ===============================
    // ✅ DROPDOWN
    // ===============================
    public async getItemDropdown(): Promise<{ id: string; label: string }[]> {
        try {
            return await this.rmsPurchaseRepository.getDataByItemId();
        } catch (error) {
            console.error("Dropdown Error:", error);
            throw new Error("Failed to load dropdown");
        }
    }

    // ===============================
    // 🔢 PURCHASE NUMBER
    // ===============================
    public async generatePurchaseNumber(supplierCode: string): Promise<string> {
        try {
            const result = await AppDataSource.query(`
                SELECT
                CONCAT(
                    'PUR/',
                    TO_CHAR(NOW(), 'YYYYMM'),
                    '/',
                    $1::text,
                    '-',
                    LPAD(nextval('rms_purchase_seq')::text, 3, '0')
                ) AS "purchaseNumber"
            `, [supplierCode]);

            return result[0].purchaseNumber;
        } catch (error) {
            console.error("Generate Number Error:", error);
            throw new Error("Failed to generate purchase number");
        }
    }

    // ===============================
    // 📄 GENERATE PDF
    // ===============================
    public async generatePdf(id: number): Promise<{ pdfBuffer: Buffer; emailSent?: boolean }> {

        try {
            const purchase = await this.edit(id);
            if (!purchase) throw new Error('Purchase not found');

            const itemsWithDetails = purchase.items || [];

            const totalAmount = itemsWithDetails.reduce((sum, item: any) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                return sum + qty * price;
            }, 0);

            const pdfDoc = await PDFDocument.create();

            // Load header and footer images
            const headerImageBytes = fs.readFileSync('src/public/dist/img/header.png');
            const footerImageBytes = fs.readFileSync('src/public/dist/img/footer.png');
            const signatureBytes = fs.readFileSync('src/public/dist/img/sig.png');

            const headerImage = await pdfDoc.embedPng(headerImageBytes);
            const footerImage = await pdfDoc.embedPng(footerImageBytes);
            const signatureImage = await pdfDoc.embedPng(signatureBytes);

            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Page setup
            const margin = 50;
            const lineHeight = 14;
            const BOTTOM_LIMIT = 120;

            let page = pdfDoc.addPage();
            let { width, height } = page.getSize();

            let yPosition = height - 120;

            // Clean text function
            const cleanText = (text: any): string => {
                return String(text || '')
                    .replace(/\r/g, '')
                    .replace(/\t/g, ' ')
                    .replace(/[^\x20-\x7E\n]/g, '');
            };

            // Wrap text function
            const wrapTextByWidth = (
                text: string,
                maxWidth: number,
                font: any,
                fontSize: number
            ): string[] => {
                const safeText = cleanText(text);
                const paragraphs = safeText.split('\n');

                const lines: string[] = [];

                for (const paragraph of paragraphs) {
                    const words = paragraph.split(' ');
                    let line = '';

                    for (const word of words) {
                        const testLine = line ? line + ' ' + word : word;
                        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

                        if (testWidth > maxWidth) {
                            if (line) lines.push(line);
                            line = word;
                        } else {
                            line = testLine;
                        }
                    }

                    if (line) lines.push(line);
                    lines.push('');
                }

                return lines;
            };

            // Header/Footer
            const drawHeaderFooter = () => {
                const headerHeight = 60;
                const footerHeight = 50;

                page.drawImage(headerImage, {
                    x: 0,
                    y: height - headerHeight,
                    width,
                    height: headerHeight,
                });

                page.drawImage(footerImage, {
                    x: 0,
                    y: 0,
                    width,
                    height: footerHeight,
                });
            };

            // New page
            const addPage = () => {
                page = pdfDoc.addPage();
                ({ width, height } = page.getSize());

                drawHeaderFooter();

                yPosition = height - 120;
            };

            // Draw text
            const drawText = (text: string, x: number, size = 11, font = helvetica) => {
                if (yPosition < BOTTOM_LIMIT) addPage();

                page.drawText(cleanText(text), {
                    x,
                    y: yPosition,
                    size,
                    font,
                    color: rgb(0, 0, 0),
                });

                yPosition -= lineHeight;
            };

            // First page header/footer
            drawHeaderFooter();

            // Title
            page.drawText('RMS Tech Solutions', {
                x: margin,
                y: yPosition,
                size: 18,
                font: helveticaBold,
            });
            yPosition -= 25;

            page.drawText('Purchase Request', {
                x: margin,
                y: yPosition,
                size: 14,
                font: helveticaBold,
            });
            yPosition -= 20;

            drawText(`Purchase Number: ${purchase.purchaseNumber}`, margin);
            drawText(`Date: ${new Date().toLocaleDateString()}`, margin);
            drawText(`Supplier: ${purchase.supplierName || ''}`, margin);
            if (purchase.supplierEmail) drawText(`Email: ${purchase.supplierEmail}`, margin);
            if (purchase.notes) drawText(`Notes: ${purchase.notes}`, margin);

            yPosition -= 10;

            // Table Header
            const drawTableHeader = () => {
                page.drawText('SL', { x: margin, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Item Description', { x: margin + 40, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Quantity', { x: margin + 350, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Unit Price', { x: margin + 420, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Amount', { x: margin + 490, y: yPosition, size: 10, font: helveticaBold });

                yPosition -= 12;

                page.drawLine({
                    start: { x: margin, y: yPosition },
                    end: { x: width - margin, y: yPosition },
                    thickness: 1,
                });

                yPosition -= 10;
            };

            drawTableHeader();

            // Items
            for (let i = 0; i < itemsWithDetails.length; i++) {
                const item: any = itemsWithDetails[i];
                const qty = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                const amount = qty * unitPrice;

                let description = item.itemName || '';
                if (item.description) {
                    description += '\n' + item.description;
                }

                const wrappedLines = wrapTextByWidth(description, 300, helvetica, 10);
                const rowHeight = wrappedLines.length * 14;

                if (yPosition < BOTTOM_LIMIT + rowHeight) {
                    addPage();
                    drawTableHeader();
                }

                const rowY = yPosition;

                page.drawText(String(i + 1), {
                    x: margin,
                    y: rowY,
                    size: 10,
                    font: helvetica,
                });

                const rightAlign = (text: string, x: number) => {
                    const w = helvetica.widthOfTextAtSize(text, 10);
                    page.drawText(text, {
                        x: x - w,
                        y: rowY,
                        size: 10,
                        font: helvetica,
                    });
                };

                rightAlign(String(qty), margin + 400);
                rightAlign(this.formatCurrency(unitPrice), margin + 470);
                rightAlign(this.formatCurrency(amount), margin + 540);

                let textY = rowY;

                for (const line of wrappedLines) {
                    if (!line.trim()) {
                        textY -= 6;
                        continue;
                    }

                    page.drawText(line, {
                        x: margin + 40,
                        y: textY,
                        size: 10,
                        font: helvetica,
                    });

                    textY -= 14;
                }

                yPosition = textY - 6;

                page.drawLine({
                    start: { x: margin, y: yPosition },
                    end: { x: width - margin, y: yPosition },
                    thickness: 0.5,
                });

                yPosition -= 10;
            }

            // Total
            yPosition -= 10;

            if (yPosition < BOTTOM_LIMIT) addPage();

            page.drawText(`Total: ${this.formatCurrency(totalAmount)}`, {
                x: margin + 400,
                y: yPosition,
                size: 12,
                font: helveticaBold,
            });

            yPosition -= 20;

            drawText(`In words: ${this.numberToWords(Math.floor(totalAmount))} only.`, margin);

            yPosition -= 30;

            // Terms
            if (yPosition < BOTTOM_LIMIT) addPage();

            drawText('Terms & Conditions:', margin, 12, helveticaBold);
            drawText('1. Payment terms: 30 days from invoice date.', margin + 10, 10, helvetica);
            drawText('2. Delivery: Within 7-10 working days.', margin + 10, 10, helvetica);
            drawText('3. Warranty: As per manufacturer terms.', margin + 10, 10, helvetica);

            yPosition -= 10;

            drawText('Best Regards,', margin, 12, helveticaBold);
            drawText('RMS Tech Solutions', margin, 12, helvetica);

            if (yPosition < 150) {
                addPage();
            }

            yPosition -= 10;

            page.drawImage(signatureImage, {
                x: margin,
                y: yPosition - 40,
                width: 120,
                height: 60,
            });

            yPosition -= 50;

            // Signature text
            page.drawText('Md. Masud Rana', {
                x: margin,
                y: yPosition,
                size: 11,
                font: helveticaBold,
            });

            page.drawText('Technical Manager', {
                x: margin,
                y: yPosition - 15,
                size: 10,
                font: helvetica,
            });

            page.drawText('RMS Tech Solutions', {
                x: margin,
                y: yPosition - 30,
                size: 10,
                font: helvetica,
            });

            // Save
            const pdfBytes = await pdfDoc.save();

            return {
                pdfBuffer: Buffer.from(pdfBytes),
                emailSent: false,
            };

        } catch (error: any) {
            console.error('Error generating PDF:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    private formatCurrency(value: number): string {
        return `$${value.toFixed(2)}`;
    }

    private numberToWords(amount: number): string {
        // Simple number to words implementation
        const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if (amount === 0) return 'Zero';

        let words = '';

        if (amount >= 1000) {
            words += units[Math.floor(amount / 1000)] + ' Thousand ';
            amount %= 1000;
        }

        if (amount >= 100) {
            words += units[Math.floor(amount / 100)] + ' Hundred ';
            amount %= 100;
        }

        if (amount >= 20) {
            words += tens[Math.floor(amount / 10)] + ' ';
            amount %= 10;
        } else if (amount >= 10) {
            words += teens[amount - 10] + ' ';
            amount = 0;
        }

        if (amount > 0) {
            words += units[amount] + ' ';
        }

        return words.trim();
    }
}