import { Config } from "../../../core/Config";
// import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
    IRmsQuotation,
    IRmsQuotationItem,
    IRmsQuotationRepository
} from "../interfaces/rms.quotation.interface";
import { AppDataSource } from "../../../init";
import * as fs from 'fs';

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
                return sum + (qty * price);
            }, 0);

            const pdfDoc = await PDFDocument.create();

            // Embed Fonts
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Load Images
            const headerImage = await pdfDoc.embedPng(fs.readFileSync('src/public/dist/img/header.png'));
            const footerImage = await pdfDoc.embedPng(fs.readFileSync('src/public/dist/img/footer.png'));
            const signatureImage = await pdfDoc.embedPng(fs.readFileSync('src/public/dist/img/sig.png'));

            // Page Constants
            const margin = 50;
            const width = 595.28;
            const height = 841.89;
            const BOTTOM_LIMIT = 100;
            let yPosition = height - 130;

            let page = pdfDoc.addPage([width, height]);

            // ================= HELPERS =================
            const drawHeaderFooter = (p: any) => {
                p.drawImage(headerImage, { x: 0, y: height - 100, width, height: 100 });
                p.drawImage(footerImage, { x: 0, y: 0, width, height: 45 });
            };

            const addNewPage = () => {
                page = pdfDoc.addPage([width, height]);
                drawHeaderFooter(page);
                yPosition = height - 130;
                return page;
            };

            // =====================================
            // CLEAN TEXT
            // =====================================
            const cleanText = (text: any): string => {
                return String(text || '')
                    // Decode HTML entities
                    .replace(/&bull;/gi, '•')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/&amp;/gi, '&')
                    .replace(/&quot;/gi, '"')
                    .replace(/&#39;/gi, "'")

                    // Convert <br> tags to new lines (important if content comes from editor)
                    .replace(/<br\s*\/?>/gi, '\n')

                    // Convert closing paragraph tags to paragraph breaks
                    .replace(/<\/p>/gi, '\n\n')

                    // Remove opening paragraph tags
                    .replace(/<p[^>]*>/gi, '')

                    // Convert list items to bullet points
                    .replace(/<li[^>]*>/gi, '• ')
                    .replace(/<\/li>/gi, '\n')

                    // Remove ul/ol tags
                    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')

                    // Remove any remaining HTML tags
                    .replace(/<[^>]+>/g, '')

                    // Normalize line endings
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')

                    // Replace tabs with single spaces
                    .replace(/\t/g, ' ')

                    // Remove spaces around new lines
                    .replace(/[ \t]*\n[ \t]*/g, '\n')

                    // Collapse multiple spaces within a line
                    .replace(/[ ]{2,}/g, ' ')

                    // Preserve paragraph breaks:
                    // 2 or more newlines = paragraph break
                    .replace(/\n{2,}/g, '\n\n')

                    // Remove unsupported characters, but keep bullets and newlines
                    .replace(/[^\x20-\x7E\n•]/g, '')

                    .trim();
            };

            // =====================================
            // WRAP TEXT
            // =====================================
            const wrapText = (
                text: string,
                maxWidth: number,
                pdfFont: any,
                fontSize: number
            ): string[] => {
                const safeText = cleanText(text);

                // Split paragraphs by double newline
                const paragraphs = safeText.split('\n\n');

                const lines: string[] = [];

                for (const paragraph of paragraphs) {
                    const trimmedParagraph = paragraph.trim();

                    if (!trimmedParagraph) {
                        lines.push('');
                        continue;
                    }

                    // Split paragraph into individual lines
                    const rawLines = trimmedParagraph.split('\n');

                    for (const rawLine of rawLines) {
                        const lineText = rawLine.trim();

                        if (!lineText) {
                            lines.push('');
                            continue;
                        }

                        // Detect bullet line
                        const isBullet = lineText.startsWith('•');
                        const bulletPrefix = isBullet ? '• ' : '';
                        const content = isBullet
                            ? lineText.substring(1).trim()
                            : lineText;

                        const words = content.split(/\s+/);
                        let currentLine = bulletPrefix;
                        let firstLine = true;

                        for (const word of words) {
                            const testLine =
                                currentLine.trim().length === 0
                                    ? word
                                    : `${currentLine}${word}`;

                            const testWidth = pdfFont.widthOfTextAtSize(
                                testLine,
                                fontSize
                            );

                            if (testWidth > maxWidth) {
                                if (currentLine.trim()) {
                                    lines.push(currentLine.trimEnd());
                                }

                                // Indent wrapped bullet lines
                                currentLine =
                                    isBullet && !firstLine
                                        ? '   ' + word + ' '
                                        : (isBullet ? '   ' : '') + word + ' ';

                                firstLine = false;
                            } else {
                                currentLine = testLine + ' ';
                            }
                        }

                        if (currentLine.trim()) {
                            lines.push(currentLine.trimEnd());
                        }
                    }

                    // Add blank line after each paragraph
                    lines.push('');
                }

                // Remove trailing blank lines
                while (lines.length > 0 && lines[lines.length - 1] === '') {
                    lines.pop();
                }

                return lines;
            };

            const drawTableGrid = (y: number, h: number, columnWidths: number[]) => {
                const tWidth = columnWidths.reduce((a, b) => a + b, 0);
                page.drawRectangle({ x: margin, y: y - h + 10, width: tWidth, height: h, borderColor: rgb(0,0,0), borderWidth: 1 });
                let currX = margin;
                for (let i = 0; i < columnWidths.length - 1; i++) {
                    currX += columnWidths[i];
                    page.drawLine({ start: { x: currX, y: y + 10 }, end: { x: currX, y: y - h + 10 }, thickness: 1 });
                }
            };

            // Start Page 1
            drawHeaderFooter(page);

            // ================= PAGE 1: COVER LETTER =================
            page.drawText('QUOTATION', { x: margin, y: yPosition, size: 20, font: fontBold });

            // Date on Right
            const dateStr = `Date: ${new Date().toLocaleDateString('en-GB')}`;
            page.drawText(dateStr, { x: width - margin - font.widthOfTextAtSize(dateStr, 11), y: yPosition, size: 11, font });

            yPosition -= 30;
            page.drawText(`Ref: ${String(quotation.refNumber || '').replace(/[^\x20-\x7E]/g, '')}`, { x: margin, y: yPosition, size: 11, font: fontBold });
            yPosition -= 20;
            page.drawText(`To: ${String(quotation.companyName || '').replace(/[^\x20-\x7E]/g, '')}`, { x: margin, y: yPosition, size: 11, font: fontBold });
            yPosition -= 25;

            // Subject
            const subLines = wrapText(`Subject: ${quotation.subject}`, width - (margin * 2), fontBold, 11);
            subLines.forEach(l => {
                page.drawText(l, { x: margin, y: yPosition, size: 11, font: fontBold });
                yPosition -= 15;
            });

            yPosition -= 10;

            // Description Body
            const descriptionLines = wrapText(quotation.discriptions, width - (margin * 2), font, 11);

            for (const line of descriptionLines) {
                if (yPosition < BOTTOM_LIMIT + 40) {
                    page = pdfDoc.addPage([width, height]);
                    drawHeaderFooter(page);
                    yPosition = height - 130;
                }

                if (line === '') {
                    yPosition -= 10;
                } else {
                    page.drawText(line, { x: margin, y: yPosition, size: 11, font });
                    yPosition -= 15;
                }
            }

            yPosition -= 30;
            page.drawText('Best Regards,', { x: margin, y: yPosition, size: 11, font: fontBold });
            yPosition -= 50;
            page.drawImage(signatureImage, { x: margin, y: yPosition, width: 100, height: 50 });
            yPosition -= 15;
            page.drawText('Md. Masud Rana', { x: margin, y: yPosition, size: 10, font: fontBold });
            yPosition -= 12;
            page.drawText('Technical Manager | RMS Tech Solutions', { x: margin, y: yPosition, size: 9, font });

            // ================= PAGE 2: ITEMS TABLE =================
            addNewPage(); // Forces items to start on Page 2

            const cols = [35, 245, 45, 85, 85];

            const drawHeader = (y: number) => {
                drawTableGrid(y, 22, cols);
                page.drawText('SL', { x: margin + 8, y: y - 2, size: 10, font: fontBold });
                page.drawText('Description', { x: margin + 45, y: y - 2, size: 10, font: fontBold });
                page.drawText('Qty', { x: margin + 285, y: y - 2, size: 10, font: fontBold });
                page.drawText('Unit Price', { x: margin + 335, y: y - 2, size: 10, font: fontBold });
                page.drawText('Total (BDT)', { x: margin + 420, y: y - 2, size: 10, font: fontBold });
            };

            drawHeader(yPosition);
            yPosition -= 22;

            for (let i = 0; i < itemsWithDetails.length; i++) {
                const item = itemsWithDetails[i];
                const qty = Number(item.quarterly) || 0;
                const price = Number(item.rmsPrice) || 0;
                const sub = qty * price;

                const itemTxt = `${item.itemName}${item.itemConfigurations ? '\n' + item.itemConfigurations : ''}`;
                const wrappedItem = wrapText(itemTxt, 235, font, 9);
                const rowH = Math.max(wrappedItem.length * 14 + 10, 30);

                if (yPosition - rowH < BOTTOM_LIMIT) {
                    addNewPage();
                    drawHeader(yPosition);
                    yPosition -= 22;
                }

                drawTableGrid(yPosition, rowH, cols);
                page.drawText(String(i + 1), { x: margin + 12, y: yPosition - 5, size: 9, font });

                let lineY = yPosition - 5;
                wrappedItem.forEach(l => {
                    page.drawText(l, { x: margin + 45, y: lineY, size: 9, font });
                    lineY -= 12;
                });

                page.drawText(String(qty), { x: margin + 295, y: yPosition - 5, size: 9, font });
                page.drawText(this.formatCurrency(price), { x: margin + 340, y: yPosition - 5, size: 9, font });
                page.drawText(this.formatCurrency(sub), { x: margin + 425, y: yPosition - 5, size: 9, font });

                yPosition -= rowH;
            }

            // ================= FINAL TOTAL & TERMS =================
            yPosition -= 20;
            if (yPosition < 150) addNewPage();

            page.drawText(`Total Amount: BDT ${this.formatCurrency(totalAmount)}`, { x: width - margin - 180, y: yPosition, size: 12, font: fontBold });
            yPosition -= 15;
            page.drawText(`In words: ${this.numberToWords(Math.floor(totalAmount))} Taka Only.`, { x: margin, y: yPosition, size: 10, font: fontBold });

            yPosition -= 40;
            page.drawText('Terms & Conditions:', { x: margin, y: yPosition, size: 10, font: fontBold });
            yPosition -= 15;
            ["1. Timeline: 10 working days.", "2. Payment: 50% Advance, 50% on Delivery.", "3. Warranty: 12 Months Manufacturing."].forEach(t => {
                page.drawText(t, { x: margin + 10, y: yPosition, size: 9, font });
                yPosition -= 12;
            });

            yPosition -= 20;
            page.drawText('Best Regards,', { x: margin, y: yPosition, size: 11, font: fontBold });
            yPosition -= 50;
            page.drawImage(signatureImage, { x: margin, y: yPosition, width: 100, height: 50 });
            yPosition -= 15;
            page.drawText('Md. Masud Rana', { x: margin, y: yPosition, size: 10, font: fontBold });
            yPosition -= 12;
            page.drawText('Technical Manager | RMS Tech Solutions', { x: margin, y: yPosition, size: 9, font });

            const pdfBytes = await pdfDoc.save();
            return { pdfBuffer: Buffer.from(pdfBytes), emailSent: false };

        } catch (error: any) {
            console.error('PDF Error:', error);
            throw new Error(`Failed: ${error.message}`);
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