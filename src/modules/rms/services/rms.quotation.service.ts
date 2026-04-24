import { Config } from "../../../core/Config";
import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { QuotationEmailService } from "../../../utils/quotation-email.service";
import {
    IRmsQuotation,
    IRmsQuotationItem,
    IRmsQuotationRepository
} from "../interfaces/rms.quotation.interface";
import { AppDataSource } from "../../../init";

const APP_CONFIG: Config = new Config(
    JSON.parse(fs.readFileSync("config.json").toString())
);

export class RmsQuotationService {
    private rmsQuotationRepository: IRmsQuotationRepository;

    constructor(rmsQuotationRepository: IRmsQuotationRepository) {
        this.rmsQuotationRepository = rmsQuotationRepository;
    }

    // ✅ CREATE (Parent + Items)
    public async create(data: Partial<IRmsQuotation>): Promise<IRmsQuotation> {
        try {
            return await this.rmsQuotationRepository.createQuotation(data);
        } catch (error) {
            console.error("Error in create service:", error);
            throw new Error("Failed to create quotation");
        }
    }

    // ✅ GET ALL
    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsQuotation[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        try {
            return await this.rmsQuotationRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching quotation list:", error);
            throw new Error("Failed to fetch quotations");
        }
    }

    // ✅ EDIT (single with items)
    public async edit(id: number): Promise<IRmsQuotation | null> {
        try {
            const record = await this.rmsQuotationRepository.edit(id);

            if (!record) {
                return null;
            }

            return record;

        } catch (error) {
            console.error("Error fetching quotation:", error);
            throw new Error("Failed to fetch quotation");
        }
    }

    // ✅ UPDATE (Parent + Items)
    public async update(
        id: number,
        data: Partial<IRmsQuotation>,
        items: IRmsQuotationItem[]
    ): Promise<any> {
        try {
            return await this.rmsQuotationRepository.update(id, data, items);
        } catch (error) {
            console.error("Error updating quotation:", error);
            throw new Error("Failed to update quotation");
        }
    }

    // ✅ DROPDOWN
    public async getItemDropdown(): Promise<{ id: string; label: string }[]> {
        try {
            return await this.rmsQuotationRepository.getDataByItemId();
        } catch (error) {
            console.error("Error loading dropdown:", error);
            throw new Error("Failed to load dropdown");
        }
    }

    public async generateRefNumber(companyName: string): Promise<string> {

        const companyCode =
            companyName?.substring(0, 2).toUpperCase() || "XX";

        const refResult = await AppDataSource.query(`
            SELECT
            CONCAT(
                'RMS/',
                TO_CHAR(NOW(), 'YYYYMM'),
                '/',
                $1::text,
                '-',
                LPAD(nextval('rms_ref_seq')::text, 3, '0')
            ) AS "refNumber"
        `, [companyCode]);

        return refResult[0].refNumber;
    }

    public async generatePdf(id: number): Promise<{ pdfBuffer: Buffer; emailSent?: boolean }> {
        try {
            const quotation = await this.edit(id);
            if (!quotation) {
                throw new Error('Quotation not found');
            }

            const itemsWithDetails = await this.getItemsWithDetails(quotation.items || []);
            const totalAmount = itemsWithDetails.reduce((sum, item) => {
                const qty = Number(item.quarterly) || 0;
                const price = Number(item.rmsPrice) || 0;
                return sum + qty * price;
            }, 0);

            const pdfDoc = await PDFDocument.create();
            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            let page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const margin = 50;
            const lineHeight = 16;
            let yPosition = height - margin;

            const addPage = () => {
                page = pdfDoc.addPage();
                yPosition = height - margin;
            };

            const drawText = (text: string, x: number, size: number, font = helvetica) => {
                if (yPosition < margin + 40) {
                    addPage();
                }
                page.drawText(text, { x, y: yPosition, size, font, color: rgb(0, 0, 0) });
                yPosition -= lineHeight;
            };

            const drawWrappedText = (text: string, x: number, maxChars: number, size: number, font = helvetica) => {
                const words = String(text).split(' ');
                let line = '';
                for (const word of words) {
                    const candidate = line ? `${line} ${word}` : word;
                    if (candidate.length > maxChars) {
                        drawText(line, x, size, font);
                        line = word;
                    } else {
                        line = candidate;
                    }
                }
                if (line) {
                    drawText(line, x, size, font);
                }
            };

            page.drawText('RMS Tech Solutions', {
                x: margin,
                y: yPosition,
                size: 18,
                font: helveticaBold,
                color: rgb(0, 0, 0)
            });
            yPosition -= 26;
            page.drawText('Quotation', {
                x: margin,
                y: yPosition,
                size: 14,
                font: helveticaBold,
                color: rgb(0, 0, 0)
            });
            yPosition -= 24;

            drawText(`Ref Number: ${quotation.refNumber}`, margin, 12, helvetica);
            drawText(`Date: ${quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}`, margin, 12, helvetica);
            drawText(`To: ${quotation.companyName}`, margin, 12, helvetica);
            if (quotation.companyEmail) {
                drawText(`Email: ${quotation.companyEmail}`, margin, 12, helvetica);
            }
            drawText(`Subject: ${quotation.subject}`, margin, 12, helvetica);
            yPosition -= 8;

            drawText('Description:', margin, 12, helveticaBold);
            drawWrappedText(quotation.discriptions || '', margin + 10, 80, 11, helvetica);
            yPosition -= 10;

            yPosition -= 8;
            page.drawText('SL.No', { x: margin, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Item Description', { x: margin + 40, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Qty', { x: margin + 320, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Unit Price', { x: margin + 365, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Amount', { x: margin + 455, y: yPosition, size: 10, font: helveticaBold });
            yPosition -= 14;

            const drawTableRow = (index: number, description: string, qty: number, unitPrice: number, amount: number) => {
                const wrappedLines = this.wrapText(description, 45);
                const requiredHeight = wrappedLines.length * lineHeight;
                if (yPosition < margin + requiredHeight + 40) {
                    addPage();
                }
                const rowY = yPosition;
                page.drawText(String(index + 1), { x: margin, y: rowY, size: 10, font: helvetica });
                page.drawText(String(qty), { x: margin + 320, y: rowY, size: 10, font: helvetica });
                page.drawText(this.formatCurrency(unitPrice), { x: margin + 365, y: rowY, size: 10, font: helvetica });
                page.drawText(this.formatCurrency(amount), { x: margin + 455, y: rowY, size: 10, font: helvetica });

                let currentY = rowY;
                for (const line of wrappedLines) {
                    page.drawText(line, { x: margin + 40, y: currentY, size: 10, font: helvetica });
                    currentY -= lineHeight;
                }
                yPosition = currentY - 4;
            };

            itemsWithDetails.forEach((item: any, index: number) => {
                const qty = Number(item.quarterly) || 0;
                const unitPrice = Number(item.rmsPrice) || 0;
                const amount = qty * unitPrice;
                const description = [item.itemName, item.itemConfigurations].filter(Boolean).join(' - ');
                drawTableRow(index + 1, description, qty, unitPrice, amount);
            });

            yPosition -= 10;
            drawText(`Total Amount = ${this.formatCurrency(totalAmount)}`, margin + 350, 12, helveticaBold);
            drawText(`In words: ${this.numberToWords(Math.floor(totalAmount))} only.`, margin, 11, helvetica);
            yPosition -= 10;

            yPosition -= 10;
            drawText('Note: Terms & Conditions:', margin, 12, helveticaBold);
            drawText('1. Project timeline will be 10 days from receipt of the Work Order (WO).', margin + 10, 10, helvetica);
            drawText('2. 50% Advance payable upon confirmation of work order.', margin + 10, 10, helvetica);
            drawText('3. 40% Progress payment payable midway through project execution.', margin + 10, 10, helvetica);
            drawText('4. 10% Final payment payable upon successful completion and handover/delivery.', margin + 10, 10, helvetica);
            drawText('WARRANTY: Standard 12 months against manufacturing defects from delivery date.', margin + 10, 10, helvetica);
            yPosition -= 10;
            drawText('Best Regards,', margin, 12, helveticaBold);
            drawText('RMS Tech Solutions', margin, 12, helvetica);

            const pdfBytes = await pdfDoc.save();
            let emailSent = false;
            if (quotation.companyEmail) {
                const emailService = new QuotationEmailService();
                await emailService.sendQuotationPdf(
                    quotation.companyEmail,
                    quotation.companyName,
                    Buffer.from(pdfBytes),
                    quotation.refNumber
                );
                emailSent = true;
            }

            return { pdfBuffer: Buffer.from(pdfBytes), emailSent };
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    private async getItemsWithDetails(items: any[]): Promise<any[]> {
        if (!items || items.length === 0) {
            return [];
        }
        // Assuming we need to fetch item names from rms_items table
        const itemIds = items.map(item => item.itemId);
        const itemDetails = await AppDataSource.query(`
            SELECT id, "itemName", "itemPrice", "itemConfigurations"
            FROM rms_items
            WHERE id = ANY($1)
        `, [itemIds]);

        return items.map(item => {
            const detail = itemDetails.find((d: any) => d.id === item.itemId);
            return {
                ...item,
                itemName: detail?.itemName || 'Unknown',
                itemPrice: detail?.itemPrice || '0',
                itemConfigurations: detail?.itemConfigurations || ''
            };
        });
    }

    private generateHtml(quotation: any, items: any[]): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quotation - ${quotation.refNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .company { font-size: 24px; font-weight: bold; }
                .details { margin-bottom: 20px; }
                .details p { margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                th { background-color: #f0f0f0; }
                .total { font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company">RMS Tech Solutions</div>
                <h2>Quotation</h2>
            </div>
            <div class="details">
                <p><strong>Ref Number:</strong> ${quotation.refNumber}</p>
                <p><strong>Company Name:</strong> ${quotation.companyName}</p>
                <p><strong>Subject:</strong> ${quotation.subject}</p>
                <p><strong>Description:</strong> ${quotation.discriptions || ''}</p>
                <p><strong>Date:</strong> ${new Date(quotation.createdAt).toLocaleDateString()}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Configuration</th>
                        <th>RMS Price</th>
                        <th>Quarterly</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.itemName}</td>
                            <td>${item.itemConfigurations}</td>
                            <td>${item.rmsPrice}</td>
                            <td>${item.quarterly || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `;
    }

    private formatCurrency(value: number): string {
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    }

    private wrapText(text: string, maxChars: number): string[] {
        const words = String(text).split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const next = currentLine ? `${currentLine} ${word}` : word;
            if (next.length > maxChars) {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            } else {
                currentLine = next;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    private numberToWords(amount: number): string {
        const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        if (amount === 0) return 'Zero';
        if (amount < 0) return `Minus ${this.numberToWords(Math.abs(amount))}`;
        const chunk = (num: number): string => {
            let result = '';
            if (num >= 100) {
                result += `${ones[Math.floor(num / 100)]} Hundred`;
                num %= 100;
                if (num) result += ' ';
            }
            if (num >= 20) {
                result += tens[Math.floor(num / 10)];
                num %= 10;
                if (num) result += ' ';
            }
            if (num > 0 && num < 20) {
                result += ones[num];
            }
            return result;
        };
        const parts: string[] = [];
        const scales = ['','Thousand','Million','Billion'];
        let remainder = amount;
        let scaleIndex = 0;
        while (remainder > 0) {
            const part = remainder % 1000;
            if (part) {
                const text = chunk(part);
                parts.unshift(text + (scales[scaleIndex] ? ` ${scales[scaleIndex]}` : ''));
            }
            remainder = Math.floor(remainder / 1000);
            scaleIndex += 1;
        }
        return parts.join(' ').trim();
    }
}