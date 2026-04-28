import { Config } from "../../../core/Config";
import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
    IRmsDelivery,
    IRmsDeliveryItem,
    IRmsDeliveryRepository
} from "../interfaces/rms.delivery.interface";
import { AppDataSource } from "../../../init";

const APP_CONFIG: Config = new Config(
    JSON.parse(fs.readFileSync("config.json").toString())
);

export class RmsDeliveryService {
    private rmsDeliveryRepository: IRmsDeliveryRepository;

    constructor(rmsDeliveryRepository: IRmsDeliveryRepository) {
        this.rmsDeliveryRepository = rmsDeliveryRepository;
    }

    // ✅ CREATE
    public async create(data: Partial<IRmsDelivery>): Promise<IRmsDelivery> {
        try {
            return await this.rmsDeliveryRepository.createDelivery(data);
        } catch (error) {
            console.error("Error in create delivery service:", error);
            throw new Error("Failed to create delivery");
        }
    }

    // ✅ GET ALL
    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsDelivery[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        try {
            return await this.rmsDeliveryRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching delivery list:", error);
            throw new Error("Failed to fetch deliveries");
        }
    }

    // ✅ EDIT
    public async edit(id: number): Promise<IRmsDelivery | null> {
        try {
            const record = await this.rmsDeliveryRepository.edit(id);
            if (!record) {
                return null;
            }
            return record;
        } catch (error) {
            console.error("Error fetching delivery:", error);
            throw new Error("Failed to fetch delivery");
        }
    }

    // ✅ UPDATE
    public async update(
        id: number,
        data: Partial<IRmsDelivery>,
        items: IRmsDeliveryItem[]
    ): Promise<any> {
        try {
            return await this.rmsDeliveryRepository.update(id, data, items);
        } catch (error) {
            console.error("Error updating delivery:", error);
            throw new Error("Failed to update delivery");
        }
    }

    // ✅ CREATE FROM QUOTATION
    public async createFromQuotation(quotationId: number, userId?: number): Promise<IRmsDelivery> {
        try {
            const quotationData = await this.rmsDeliveryRepository.getDataByQuotationId(quotationId);

            if (!quotationData.length) {
                throw new Error("Quotation not found");
            }

            const quotation = quotationData[0];
            const deliveryNumber = await this.generateDeliveryNumber(quotation.companyName);

            const deliveryItems: IRmsDeliveryItem[] = quotationData.map((item: any) => ({
                itemId: item.itemId,
                deliveredQuantity: item.quotedQuantity, // Default to quoted quantity
                createdBy: userId
            }));

            const delivery = await this.create({
                deliveryNumber,
                quotationId,
                companyName: quotation.companyName,
                companyEmail: quotation.companyEmail,
                deliveryStatus: 'pending',
                createdBy: userId,
                items: deliveryItems
            });

            return delivery;
        } catch (error) {
            console.error("Error creating delivery from quotation:", error);
            throw new Error("Failed to create delivery from quotation");
        }
    }

    // ✅ DELETE
    public async delete(id: number): Promise<boolean> {
        try {
            return await this.rmsDeliveryRepository.delete(id);
        } catch (error) {
            console.error("Error in delete delivery service:", error);
            throw new Error("Failed to delete delivery");
        }
    }

    // ✅ GENERATE DELIVERY NUMBER
    public async generateDeliveryNumber(companyName: string): Promise<string> {
        const companyCode = companyName?.substring(0, 2).toUpperCase() || "XX";

        const refResult = await AppDataSource.query(`
            SELECT
            CONCAT(
                'DEL/',
                TO_CHAR(NOW(), 'YYYYMM'),
                '/',
                $1::text,
                '-',
                LPAD(nextval('rms_delivery_seq')::text, 3, '0')
            ) AS "deliveryNumber"
        `, [companyCode]);

        return refResult[0].deliveryNumber;
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
            console.error("Error loading delivery dropdown:", error);
            throw new Error("Failed to load dropdown");
        }
    }

    // ✅ GENERATE PDF
    public async generatePdf(id: number): Promise<{ pdfBuffer: Buffer; emailSent?: boolean }> {
        try {
            const delivery = await this.edit(id);
            if (!delivery) throw new Error('Delivery not found');

            const itemsWithDetails = await this.getItemsWithDetails(delivery.items || []);

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

            // First page header/footer
            drawHeaderFooter();

            // Text draw function
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

            // Title
            page.drawText('RMS Tech Solutions', {
                x: margin,
                y: yPosition,
                size: 18,
                font: helveticaBold,
            });
            yPosition -= 25;

            page.drawText('Delivery Challan', {
                x: margin,
                y: yPosition,
                size: 14,
                font: helveticaBold,
            });
            yPosition -= 20;

            drawText(`Challan Number: ${delivery.deliveryNumber}`, margin);
            drawText(`Delivery Date: ${new Date().toLocaleDateString()}`, margin);
            drawText(`To: ${delivery.companyName}`, margin);
            if (delivery.companyEmail) drawText(`Email: ${delivery.companyEmail}`, margin);
            if (delivery.notes) drawText(`Notes: ${delivery.notes}`, margin);

            yPosition -= 10;

            // Table Header
            const drawTableHeader = () => {
                page.drawText('SL', { x: margin, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Item Description', { x: margin + 40, y: yPosition, size: 10, font: helveticaBold });
                page.drawText('Quantity', { x: margin + 350, y: yPosition, size: 10, font: helveticaBold });

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
                const item = itemsWithDetails[i];
                const qty = Number(item.deliveredQuantity) || 0;

                let description = item.itemName || '';
                if (item.itemConfigurations) {
                    description += '\n' + item.itemConfigurations;
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

                const qtyText = String(qty);
                const qtyWidth = helvetica.widthOfTextAtSize(qtyText, 10);
                page.drawText(qtyText, {
                    x: margin + 400 - qtyWidth,
                    y: rowY,
                    size: 10,
                    font: helvetica,
                });

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

            // Delivery footer
            yPosition -= 20;

            if (yPosition < BOTTOM_LIMIT) addPage();

            drawText('Delivered by:', margin, 12, helveticaBold);
            drawText('RMS Tech Solutions', margin, 12, helvetica);

            yPosition -= 10;

            drawText('Received by:', margin, 12, helveticaBold);
            drawText('_______________________________', margin, 12, helvetica);
            drawText('Signature & Date', margin + 10, 10, helvetica);

            yPosition -= 20;

            if (yPosition < 150) {
                addPage();
            }

            const pdfBytes = await pdfDoc.save();

            return {
                pdfBuffer: Buffer.from(pdfBytes),
                emailSent: false,
            };

        } catch (error: any) {
            console.error('Error generating delivery PDF:', error);
            throw new Error(`Failed to generate delivery PDF: ${error.message}`);
        }
    }

    private async getItemsWithDetails(items: any[]): Promise<any[]> {
        if (!items || items.length === 0) {
            return [];
        }

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
}