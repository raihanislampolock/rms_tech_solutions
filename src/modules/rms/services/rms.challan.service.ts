import { Config } from "../../../core/Config";
import fs from "fs";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
    IRmsChallan,
    IRmsChallanItem,
    IRmsChallanRepository
} from "../interfaces/rms.challan.interface";
import { AppDataSource } from "../../../init";

const APP_CONFIG: Config = new Config(
    JSON.parse(fs.readFileSync("config.json").toString())
);

export class RmsChallanService {
    private rmsChallanRepository: IRmsChallanRepository;

    constructor(rmsChallanRepository: IRmsChallanRepository) {
        this.rmsChallanRepository = rmsChallanRepository;
    }

    // ✅ CREATE
    public async create(data: Partial<IRmsChallan>): Promise<IRmsChallan> {
        try {
            return await this.rmsChallanRepository.create(data);
        } catch (error) {
            console.error("Error in create challan service:", error);
            throw new Error("Failed to create challan");
        }
    }

    // ✅ GET ALL
    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsChallan[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        try {
            return await this.rmsChallanRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching challan list:", error);
            throw new Error("Failed to fetch challans");
        }
    }

    // ✅ EDIT
    public async edit(id: number): Promise<IRmsChallan | null> {
        try {
            const record = await this.rmsChallanRepository.edit(id);
            if (!record) {
                return null;
            }
            return record;
        } catch (error) {
            console.error("Error fetching challan:", error);
            throw new Error("Failed to fetch challan");
        }
    }

    // ✅ UPDATE
    public async update(
        id: number,
        data: Partial<IRmsChallan>,
        items: IRmsChallanItem[]
    ): Promise<any> {
        try {
            return await this.rmsChallanRepository.update(id, data, items);
        } catch (error) {
            console.error("Error updating challan:", error);
            throw new Error("Failed to update challan");
        }
    }

    // ✅ CREATE FROM QUOTATION
    public async createFromQuotation(refNumber: string, userId?: number): Promise<IRmsChallan> {
        try {
            const quotationData = await this.rmsChallanRepository.getDataByQuotationId(refNumber);

            if (!quotationData.length) {
                throw new Error("Quotation not found");
            }

            const quotation = quotationData[0];
            const challanNumber = await this.generateChallanNumber(quotation.companyName);

            const challanItems: IRmsChallanItem[] = quotationData.map((item: any) => ({
                itemId: item.itemId,
                deliveredQuantity: item.quarterly, // Default to quoted quantity
                createdBy: userId
            }));

            const challan = await this.create({
                challanNumber,
                quotationId: quotation.id,
                companyName: quotation.companyName,
                companyEmail: quotation.companyEmail,
                challanStatus: 'pending',
                createdBy: userId ? String(userId) : 'system',
                items: challanItems
            });

            return challan;
        } catch (error) {
            console.error("Error creating challan from quotation:", error);
            throw new Error("Failed to create challan from quotation");
        }
    }

    // ✅ DELETE
    public async delete(id: number): Promise<boolean> {
        try {
            return await this.rmsChallanRepository.delete(id);
        } catch (error) {
            console.error("Error in delete challan service:", error);
            throw new Error("Failed to delete challan");
        }
    }

    // ✅ GENERATE CHALLAN NUMBER
    public async generateChallanNumber(companyName: string): Promise<string> {
        const companyCode = companyName?.substring(0, 2).toUpperCase() || "XX";

        const refResult = await AppDataSource.query(`
            SELECT
            CONCAT(
                'CH/',
                TO_CHAR(NOW(), 'YYYYMM'),
                '/',
                $1::text,
                '-',
                LPAD(nextval('rms_challan_seq')::text, 3, '0')
            ) AS "challanNumber"
        `, [companyCode]);

        return refResult[0].challanNumber;
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
            console.error("Error loading challan dropdown:", error);
            throw new Error("Failed to load dropdown");
        }
    }

    private wrapText(text: string, maxChars: number): string[] {
        if (!text) return [''];

        const words = text.split(' ');
        const lines: string[] = [];
        let line = '';

        for (const word of words) {
            if ((line + word).length > maxChars) {
                lines.push(line.trim());
                line = word + ' ';
            } else {
                line += word + ' ';
            }
        }

        if (line.trim()) lines.push(line.trim());

        return lines;
    }

    // ✅ GENERATE PDF
    public async generatePdf(id: number): Promise<{ pdfBuffer: Buffer }> {

        try {

            const challan = await this.edit(id);

            if (!challan) {
                throw new Error("Challan not found");
            }

            const items = challan.items || [];

            const pdfDoc = await PDFDocument.create();

            const headerImageBytes = fs.readFileSync('src/public/dist/img/header.png');
            const footerImageBytes = fs.readFileSync('src/public/dist/img/footer.png');

            const headerImage = await pdfDoc.embedPng(headerImageBytes);
            const footerImage = await pdfDoc.embedPng(footerImageBytes);

            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const pageWidth = 595;
            const pageHeight = 842;

            const margin = 40;

            let page = pdfDoc.addPage([pageWidth, pageHeight]);
            let y = pageHeight - 80;

            // =========================
            // HELPERS
            // =========================

            const drawText = (text: string, x: number, yPos: number, size = 10, f = font) => {
                page.drawText(text || '', {
                    x,
                    y: yPos,
                    size,
                    font: f,
                    color: rgb(0, 0, 0)
                });
            };

            const wrapText = (
                text: string,
                maxWidth: number,
                pdfFont: any,
                size: number
            ): string[] => {

                if (!text) return [];

                const words = String(text).split(' ');
                const lines: string[] = [];

                let line = '';

                for (const word of words) {

                    const testLine = line ? `${line} ${word}` : word;

                    const width = pdfFont.widthOfTextAtSize(testLine, size);

                    if (width > maxWidth) {

                        if (line.trim()) {
                            lines.push(line.trim());
                        }

                        line = word;

                    } else {
                        line = testLine;
                    }
                }

                if (line.trim()) {
                    lines.push(line.trim());
                }

                return lines;
            };

            const addNewPage = () => {
                page.drawImage(footerImage, {
                    x: margin,
                    y: 20,
                    width: pageWidth - margin * 2,
                    height: 45
                });

                page = pdfDoc.addPage([pageWidth, pageHeight]);
                y = pageHeight - 80;

                page.drawImage(headerImage, {
                    x: 0,
                    y: pageHeight - 110,
                    width: pageWidth,
                    height: 110
                });

                y -= 60;

                drawTableHeader();
            };

            // =========================
            // HEADER
            // =========================
            page.drawImage(headerImage, {
                x: 0,
                y: pageHeight - 110,
                width: pageWidth,
                height: 110
            });

            y -= 60;

            drawText("DELIVERY CHALLAN", 210, y, 18, bold);
            y -= 25;

            drawText(`Challan No: ${challan.challanNumber}`, margin, y, 11, bold);
            drawText(`Company: ${challan.companyName}`, 300, y, 11);

            y -= 18;

            drawText(`Email: ${challan.companyEmail || ''}`, margin, y);
            drawText(`Status: ${challan.challanStatus}`, 300, y);

            y -= 25;

            // =========================
            // TABLE STRUCTURE
            // =========================

            const col = {
                sl: margin,
                item: margin + 30,
                type: margin + 180,
                model: margin + 280,
                qty: margin + 380,
                notes: margin + 440
            };

            const widths = {
                sl: 30,
                item: 150,
                type: 100,
                model: 100,
                qty: 60,
                notes: 110
            };

            // =========================
            // TABLE HEADER
            // =========================

            const drawTableHeader = () => {

                // HEADER BACKGROUND
                page.drawRectangle({
                    x: margin,
                    y: y - 5,
                    width: pageWidth - margin * 2,
                    height: 22,
                    color: rgb(0.92, 0.92, 0.92),
                    borderWidth: 1,
                    borderColor: rgb(0.6, 0.6, 0.6)
                });

                // HEADER COLUMN LINES
                const headerTop = y + 17;
                const headerBottom = y - 5;

                const headerColumns = [
                    col.item - 10,
                    col.type - 10,
                    col.model - 10,
                    col.qty - 10,
                    col.notes - 10
                ];

                headerColumns.forEach((xPos) => {
                    page.drawLine({
                        start: { x: xPos, y: headerTop },
                        end: { x: xPos, y: headerBottom },
                        thickness: 1,
                        color: rgb(0.5, 0.5, 0.5)
                    });
                });

                // HEADER TEXT
                drawText("SL", col.sl + 8, y, 10, bold);
                drawText("Item", col.item, y, 10, bold);
                drawText("Type", col.type, y, 10, bold);
                drawText("Model", col.model, y, 10, bold);
                drawText("Qty", col.qty, y, 10, bold);
                drawText("Remarks", col.notes, y, 10, bold);

                y -= 28;
            };

            drawTableHeader();

            // =========================
            // ITEMS
            // =========================

            items.forEach((item: any, index: number) => {

                const itemLines = wrapText(
                    item.itemName || '',
                    widths.item,
                    font,
                    9
                );

                const typeLines = wrapText(
                    item.itemType || '',
                    widths.type,
                    font,
                    9
                );

                const modelLines = wrapText(
                    item.itemModel || '',
                    widths.model,
                    font,
                    9
                );

                const noteLines = wrapText(
                    item.notes || '',
                    widths.notes,
                    font,
                    9
                );

                const maxLines = Math.max(
                    itemLines.length,
                    typeLines.length,
                    modelLines.length,
                    noteLines.length
                );

                const rowHeight = Math.max(maxLines * 12 + 10, 28);

                // PAGE BREAK
                if (y - rowHeight < 120) {

                    // FOOTER BEFORE NEW PAGE
                    page.drawImage(footerImage, {
                        x: 0,
                        y: 0,
                        width: pageWidth,
                        height: 70
                    });

                    // NEW PAGE
                    page = pdfDoc.addPage([pageWidth, pageHeight]);

                    // HEADER IMAGE
                    page.drawImage(headerImage, {
                        x: 0,
                        y: pageHeight - 110,
                        width: pageWidth,
                        height: 110
                    });

                    y = pageHeight - 170;

                    drawTableHeader();
                }

                // =========================
                // ROW BOX
                // =========================

                const rowTop = y + 10;
                const rowBottom = y - rowHeight + 5;

                // OUTER BORDER
                page.drawRectangle({
                    x: margin,
                    y: rowBottom,
                    width: pageWidth - margin * 2,
                    height: rowTop - rowBottom,
                    borderWidth: 0.7,
                    borderColor: rgb(0.75, 0.75, 0.75)
                });

                // =========================
                // COLUMN LINES
                // =========================

                const columns = [
                    col.item - 10,
                    col.type - 10,
                    col.model - 10,
                    col.qty - 10,
                    col.notes - 10
                ];

                columns.forEach((xPos) => {
                    page.drawLine({
                        start: { x: xPos, y: rowTop },
                        end: { x: xPos, y: rowBottom },
                        thickness: 0.5,
                        color: rgb(0.8, 0.8, 0.8)
                    });
                });

                // =========================
                // TABLE DATA
                // =========================

                drawText(
                    String(index + 1),
                    col.sl + 8,
                    y,
                    9
                );

                itemLines.forEach((line, i) => {
                    drawText(
                        line,
                        col.item,
                        y - i * 12,
                        9
                    );
                });

                typeLines.forEach((line, i) => {
                    drawText(
                        line,
                        col.type,
                        y - i * 12,
                        9
                    );
                });

                modelLines.forEach((line, i) => {
                    drawText(
                        line,
                        col.model,
                        y - i * 12,
                        9
                    );
                });

                drawText(
                    String(item.deliveredQuantity || 0),
                    col.qty + 10,
                    y,
                    9
                );

                noteLines.forEach((line, i) => {
                    drawText(
                        line,
                        col.notes,
                        y - i * 12,
                        9
                    );
                });

                y -= rowHeight + 6;
            });

            // =========================
            // FOOTER SECTION
            // =========================

            y -= 30;

            drawText("Remarks:", margin, y, 11, bold);
            y -= 18;

            drawText(challan.notes || "N/A", margin, y);

            y -= 60;

            const signatureY = 110;

            // TOP LINE
            page.drawLine({
                start: { x: margin, y: signatureY + 20 },
                end: { x: pageWidth - margin, y: signatureY + 20 },
                thickness: 1
            });

            // TITLES
            drawText(
                "Prepared By",
                margin,
                signatureY,
                10,
                bold
            );

            drawText(
                "Received By",
                240,
                signatureY,
                10,
                bold
            );

            drawText(
                "Authorized Signature",
                400,
                signatureY,
                10,
                bold
            );

            // =========================
            // FOOTER IMAGE
            // =========================

            page.drawImage(footerImage, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: 70
            });

            const pdfBytes = await pdfDoc.save();

            return {
                pdfBuffer: Buffer.from(pdfBytes)
            };

        } catch (error) {
            console.error("PDF Error:", error);
            throw new Error("Failed to generate PDF");
        }
    }

    // Helper method to get items with details
    private async getItemsWithDetails(items: IRmsChallanItem[]): Promise<any[]> {
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