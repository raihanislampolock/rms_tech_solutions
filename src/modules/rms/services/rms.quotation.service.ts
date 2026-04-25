import { Config } from "../../../core/Config";
import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
            if (!quotation) throw new Error('Quotation not found');

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

            // ================= HEADER =================
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

            const cleanText = (text: any): string => {
                if (!text) return '';
                return String(text)
                    .replace(/\r/g, '')        // ❌ remove carriage return (MAIN ERROR)
                    .replace(/\n/g, '\n')      // keep newline but normalize
                    .replace(/\t/g, ' ')       // tabs → space
                    .replace(/[^\x20-\x7E\n]/g, ''); // remove unsupported chars
            };

            const wrapTextByWidth = (
                text: string,
                maxWidth: number,
                font: any,
                fontSize: number
            ): string[] => {
            
                const clean = (val: any) =>
                    String(val || '')
                        .replace(/\r/g, '')
                        .replace(/\t/g, ' ')
                        .replace(/[^\x20-\x7E\n]/g, '');

                const safeText = clean(text);
                const paragraphs = safeText.split('\n');

                const lines: string[] = [];

                for (const paragraph of paragraphs) {
                    const words = paragraph.split(' ');
                    let line = '';
                
                    for (const word of words) {
                        const testLine = line ? line + ' ' + word : word;
                        const width = font.widthOfTextAtSize(testLine, fontSize);
                    
                        if (width > maxWidth) {
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

            // ================= DESCRIPTION =================
            const desc = quotation.discriptions || '';

            const descriptionText = cleanText(quotation.discriptions || '');

            // 🔥 use width-based wrap (same as items)
            const descLines = wrapTextByWidth(
                descriptionText,
                width - (margin * 2), // full width
                helvetica,
                11
            );

            // 🔥 manually control Y (not drawText)
            let descY = yPosition;

            descLines.forEach(line => {
                if (!line.trim()) {
                    descY -= 6;
                    return;
                }
            
                page.drawText(line, {
                    x: margin,
                    y: descY,
                    size: 11,
                    font: helvetica
                });
            
                descY -= 15; // 11 + spacing
            });

            // ✅ VERY IMPORTANT: update global Y position
            yPosition = descY - 10;

            // ================= TABLE HEADER =================
            // Add page break before table if needed
            if (yPosition < margin + 200) {
                addPage();
            }

            page.drawText('SL.No', { x: margin, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Item Description', { x: margin + 40, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Qty', { x: margin + 300, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Unit Price', { x: margin + 350, y: yPosition, size: 10, font: helveticaBold });
            page.drawText('Amount', { x: margin + 430, y: yPosition, size: 10, font: helveticaBold });
            yPosition -= 14;

            page.drawLine({
                start: { x: margin, y: yPosition },
                end: { x: width - margin, y: yPosition },
                thickness: 1
            });
            yPosition -= 10;

            // ================= ITEMS TABLE =================
            itemsWithDetails.forEach((item: any, index: number) => {
                const qty = Number(item.quarterly) || 0;
                const unitPrice = Number(item.rmsPrice) || 0;
                const amount = qty * unitPrice;

                // Build structured description with Model, Origin, Spec format
                let description = item.itemName || '';
                if (item.itemConfigurations) {
                    const configs = item.itemConfigurations.split(',').map((s: string) => s.trim());
                    // Format: "Model: X3SP Pro\nOrigin: China\nSpec: 2.4" 320×240 Color-screen Display"
                    configs.forEach((config: string) => {
                        if (config.toLowerCase().includes('model')) {
                            description += `\nModel: ${config.replace(/model[:\s]*/i, '').trim()}`;
                        } else if (config.toLowerCase().includes('origin')) {
                            description += `\nOrigin: ${config.replace(/origin[:\s]*/i, '').trim()}`;
                        } else if (config.toLowerCase().includes('spec')) {
                            description += `\nSpec: ${config.replace(/spec[:\s]*/i, '').trim()}`;
                        } else {
                            description += `\n${config}`;
                        }
                    });
                }

                const cleanText = (text: any): string => {
                    if (!text) return '';

                    return String(text)
                        .replace(/\r/g, '')        // ❌ remove carriage return (MAIN ERROR)
                        .replace(/\n/g, '\n')      // keep newline but normalize
                        .replace(/\t/g, ' ')       // tabs → space
                        .replace(/[^\x20-\x7E\n]/g, ''); // remove unsupported chars
                };

                const wrapTextByWidth = (
                    text: string,
                    maxWidth: number,
                    font: any,
                    fontSize: number
                ) => {
                    const safeText = cleanText(text); // ✅ CLEAN FIRST
                
                    const paragraphs = safeText.split('\n');
                    const lines: string[] = [];
                
                    for (const paragraph of paragraphs) {
                        const words = paragraph.split(' ');
                        let line = '';
                    
                        for (const word of words) {
                            const testLine = line ? line + ' ' + word : word;
                        
                            const width = font.widthOfTextAtSize(testLine, fontSize);
                        
                            if (width > maxWidth) {
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

                const wrappedLines = wrapTextByWidth(
                    description,
                    240,          // 🔥 width of description column (important)
                    helvetica,
                    10
                );
                const requiredHeight = wrappedLines.length * (10 + 4);

                // Check if we need a new page for this item
                if (yPosition < margin + requiredHeight + 40) {
                    addPage();
                    // Redraw table header on new page
                    page.drawText('SL.No', { x: margin, y: yPosition, size: 10, font: helveticaBold });
                    page.drawText('Item Description', { x: margin + 40, y: yPosition, size: 10, font: helveticaBold });
                    page.drawText('Qty', { x: margin + 300, y: yPosition, size: 10, font: helveticaBold });
                    page.drawText('Unit Price', { x: margin + 350, y: yPosition, size: 10, font: helveticaBold });
                    page.drawText('Amount', { x: margin + 430, y: yPosition, size: 10, font: helveticaBold });
                    yPosition -= 14;

                    page.drawLine({
                        start: { x: margin, y: yPosition },
                        end: { x: width - margin, y: yPosition },
                        thickness: 1
                    });
                    yPosition -= 10;
                }

                const rowStartY = yPosition;

                // Draw serial number at row start
                page.drawText(String(index + 1), { x: margin, y: rowStartY, size: 10, font: helvetica });

                // Draw right-aligned numeric values at row start
                const rightAlignText = (text: string, xPos: number) => {
                    const textWidth = helvetica.widthOfTextAtSize(text, 10);
                    page.drawText(text, {
                        x: xPos - textWidth,
                        y: rowStartY,
                        size: 10,
                        font: helvetica
                    });
                };

                rightAlignText(String(qty), margin + 320);
                rightAlignText(this.formatCurrency(unitPrice), margin + 400);
                rightAlignText(this.formatCurrency(amount), margin + 480);

                // Draw multi-line description
                let currentY = rowStartY;
                for (const line of wrappedLines) {
                    if (!line.trim()) {
                        currentY -= 6; // spacing for blank line
                        continue;
                    }
                
                    page.drawText(line, {
                        x: margin + 40,
                        y: currentY,
                        size: 10,
                        font: helvetica
                    });
                
                    currentY -= 14; // 10 font + spacing
                }

                yPosition = currentY - 4;

                // Draw separator line
                page.drawLine({
                    start: { x: margin, y: yPosition },
                    end: { x: width - margin, y: yPosition },
                    thickness: 0.5
                });
                yPosition -= 8;
            });

            // ================= TOTAL =================
            yPosition -= 10;

            page.drawText(`Total Amount: ${this.formatCurrency(totalAmount)}`, {
                x: margin + 350,
                y: yPosition,
                size: 12,
                font: helveticaBold,
                color: rgb(0, 0, 0)
            });
            yPosition -= 20;

            drawText(`In words: ${this.numberToWords(Math.floor(totalAmount))} only.`, margin, 11, helvetica);
            yPosition -= 10;

            // ================= TERMS & CONDITIONS =================
            drawText('Note: Terms & Conditions:', margin, 12, helveticaBold);
            drawText('1. Project timeline will be 10 days from receipt of the Work Order (WO).', margin + 10, 10, helvetica);
            drawText('2. 50% Advance payable upon confirmation of work order.', margin + 10, 10, helvetica);
            drawText('3. 40% Progress payment payable midway through project execution.', margin + 10, 10, helvetica);
            drawText('4. 10% Final payment payable upon successful completion and handover/delivery.', margin + 10, 10, helvetica);
            drawText('WARRANTY: Standard 12 months against manufacturing defects from delivery date.', margin + 10, 10, helvetica);
            yPosition -= 10;

            // ================= SIGNATURE =================
            drawText('Best Regards,', margin, 12, helveticaBold);
            drawText('RMS Tech Solutions', margin, 12, helvetica);

            const pdfBytes = await pdfDoc.save();

            return { pdfBuffer: Buffer.from(pdfBytes), emailSent: false };
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
                // Break long words
                if (currentLine.length > maxChars) {
                    const chunks: string[] = [];
                    for (let i = 0; i < currentLine.length; i += maxChars) {
                        chunks.push(currentLine.substring(i, i + maxChars));
                    }
                    lines.push(...chunks);
                    currentLine = '';
                }
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