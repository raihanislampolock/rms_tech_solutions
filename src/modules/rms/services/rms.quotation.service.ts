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

            // ================= FILES =================
            const headerImageBytes = fs.readFileSync('src/public/dist/img/header.png');
            const footerImageBytes = fs.readFileSync('src/public/dist/img/footer.png');
            const signatureBytes = fs.readFileSync('src/public/dist/img/sig.png');
            const signatureImage = await pdfDoc.embedPng(signatureBytes);

            const headerImage = await pdfDoc.embedPng(headerImageBytes);
            const footerImage = await pdfDoc.embedPng(footerImageBytes);

            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // ================= PAGE SETUP =================
            const margin = 50;
            const lineHeight = 14;
            const BOTTOM_LIMIT = 120;

            let page = pdfDoc.addPage();
            let { width, height } = page.getSize();

            let yPosition = height - 120; // SAFE START POSITION

            // ================= CLEAN TEXT =================
            const cleanText = (text: any): string => {
                return String(text || '')
                    .replace(/\r/g, '')
                    .replace(/\t/g, ' ')
                    .replace(/[^\x20-\x7E\n]/g, '');
            };

            // ================= WRAP TEXT =================
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

            // ================= HEADER / FOOTER =================
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

            // ================= NEW PAGE =================
            const addPage = () => {
                page = pdfDoc.addPage();
                ({ width, height } = page.getSize());

                drawHeaderFooter();

                yPosition = height - 120; // reset safe content start
            };

            // first page header/footer
            drawHeaderFooter();

            // ================= TEXT DRAW =================
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

            // ================= TITLE =================
            page.drawText('RMS Tech Solutions', {
                x: margin,
                y: yPosition,
                size: 18,
                font: helveticaBold,
            });
            yPosition -= 25;

            page.drawText('Quotation', {
                x: margin,
                y: yPosition,
                size: 14,
                font: helveticaBold,
            });
            yPosition -= 20;

            drawText(`Ref Number: ${quotation.refNumber}`, margin);
            drawText(`Date: ${new Date().toLocaleDateString()}`, margin);
            drawText(`To: ${quotation.companyName}`, margin);
            if (quotation.companyEmail) drawText(`Email: ${quotation.companyEmail}`, margin);
            drawText(`Subject: ${quotation.subject}`, margin);

            yPosition -= 10;

            // ================= DESCRIPTION =================
            page.drawText('Description:', {
                x: margin,
                y: yPosition,
                size: 12,
                font: helveticaBold,
            });
            yPosition -= 15;

            const descLines = wrapTextByWidth(
                quotation.discriptions || '',
                width - margin * 2,
                helvetica,
                11
            );

            for (const line of descLines) {
                if (!line.trim()) {
                    yPosition -= 6;
                    continue;
                }

                if (yPosition < BOTTOM_LIMIT) addPage();

                page.drawText(line, {
                    x: margin,
                    y: yPosition,
                    size: 11,
                    font: helvetica,
                });

                yPosition -= 14;
            }

            yPosition -= 10;

            // ===== SIGNATURE ON FIRST PAGE =====
            const signatureY = 150; // bottom anchor

            // Signature Image
            page.drawImage(signatureImage, {
                x: margin,
                y: signatureY,
                width: 120,
                height: 60,
            });

            // Text ABOVE the signature (not using drawText)
            page.drawText('Best Regards,', {
                x: margin,
                y: signatureY + 80,
                size: 12,
                font: helveticaBold,
            });

            page.drawText('RMS Tech Solutions', {
                x: margin,
                y: signatureY + 60,
                size: 12,
                font: helvetica,
            });

            // Name & designation BELOW signature
            page.drawText('Md. Masud Rana', {
                x: margin,
                y: signatureY - 15,
                size: 11,
                font: helveticaBold,
            });

            page.drawText('Technical Manager', {
                x: margin,
                y: signatureY - 30,
                size: 10,
                font: helvetica,
            });

            page.drawText('RMS Tech Solutions', {
                x: margin,
                y: signatureY - 45,
                size: 10,
                font: helvetica,
            });
            addPage();

            // ================= TABLE HEADER =================
            const drawTableHeader = () => {
                page.drawText('SL', { x: margin, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Description', { x: margin + 40, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Qty', { x: margin + 300, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Unit Price', { x: margin + 350, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Amount', { x: margin + 430, y: yPosition, size: 10, font: helveticaBold });

                yPosition -= 12;

                page.drawLine({
                    start: { x: margin, y: yPosition },
                    end: { x: width - margin, y: yPosition },
                    thickness: 1,
                });

                yPosition -= 10;
            };

            drawTableHeader();

            // ================= ITEMS =================
            for (let i = 0; i < itemsWithDetails.length; i++) {
                const item = itemsWithDetails[i];

                const qty = Number(item.quarterly) || 0;
                const unitPrice = Number(item.rmsPrice) || 0;
                const amount = qty * unitPrice;

                let description = item.itemName || '';
                if (item.itemConfigurations) {
                    description += '\n' + item.itemConfigurations;
                }

                const wrappedLines = wrapTextByWidth(description, 240, helvetica, 10);
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

                rightAlign(String(qty), margin + 320);
                rightAlign(this.formatCurrency(unitPrice), margin + 400);
                rightAlign(this.formatCurrency(amount), margin + 480);

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

            // ================= TOTAL =================
            yPosition -= 10;

            if (yPosition < BOTTOM_LIMIT) addPage();

            page.drawText(`Total: ${this.formatCurrency(totalAmount)}`, {
                x: margin + 350,
                y: yPosition,
                size: 12,
                font: helveticaBold,
            });

            yPosition -= 20;

            drawText(`In words: ${this.numberToWords(Math.floor(totalAmount))} only.`, margin);

            yPosition -= 30;

            // ================= TERMS =================
            if (yPosition < BOTTOM_LIMIT) addPage();

            drawText('Note: Terms & Conditions:', margin, 12, helveticaBold);
            drawText('1. Project timeline: 10 days.', margin + 10, 10, helvetica);
            drawText('2. 50% Advance payable.', margin + 10, 10, helvetica);
            drawText('3. 40% Progress payment.', margin + 10, 10, helvetica);
            drawText('4. 10% Final payment.', margin + 10, 10, helvetica);
            drawText('WARRANTY: 12 months manufacturing warranty.', margin + 10, 10, helvetica);

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

            // ================= SIGNATURE TEXT =================
            drawText('Md. Masud Rana', margin, 11, helveticaBold);
            drawText('Technical Manager', margin, 10, helvetica);
            drawText('RMS Tech Solutions', margin, 10, helvetica);

            // ================= SAVE =================
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