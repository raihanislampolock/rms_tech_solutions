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
                deliveredQuantity: Number(item.quarterly || 0),
                notes: '',
                createdBy: userId ? String(userId) : 'system'
            }));

            const challan = await this.create({
                challanNumber,
                quotationId: quotation.id,
                companyName: quotation.companyName,
                companyEmail: quotation.companyEmail,
                notes: quotation.discriptions || undefined,
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

    public async getQuotationForChallan(refNumber: string): Promise<any> {
        const quotationData = await this.rmsChallanRepository.getDataByQuotationId(refNumber);

        if (!quotationData.length) {
            throw new Error("Quotation not found");
        }

        const firstRow = quotationData[0];

        return {
            quotationId: firstRow.id,
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
                itemPrice: item.itemPrice,
                deliveredQuantity: Number(item.quarterly || 0),
                availableStock: Number(item.availableStock || 0),
                notes: ''
            }))
        };
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

    // private wrapText(text: string, maxChars: number): string[] {
    //     if (!text) return [''];

    //     const words = text.split(' ');
    //     const lines: string[] = [];
    //     let line = '';

    //     for (const word of words) {
    //         if ((line + word).length > maxChars) {
    //             lines.push(line.trim());
    //             line = word + ' ';
    //         } else {
    //             line += word + ' ';
    //         }
    //     }

    //     if (line.trim()) lines.push(line.trim());

    //     return lines;
    // }

    // ✅ GENERATE PDF
    public async generatePdf(id: number): Promise<{ pdfBuffer: Buffer }> {
        try {
            const challan = await this.edit(id);
            if (!challan) {
                throw new Error("Challan not found");
            }

            const items = challan.items || [];
            const pdfDoc = await PDFDocument.create();

            // Load fonts
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Load layout branding images
            const headerImage = await pdfDoc.embedPng(fs.readFileSync('src/public/dist/img/header.png'));
            const footerImage = await pdfDoc.embedPng(fs.readFileSync('src/public/dist/img/footer.png'));
            const signatureImage = await pdfDoc.embedPng(fs.readFileSync('src/public/dist/img/signature.png'));

            // Page layout constants
            const margin = 40;
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const BOTTOM_LIMIT = 120;
            let yPosition = pageHeight - 130;

            let page = pdfDoc.addPage([pageWidth, pageHeight]);

            // =====================================
            // HELPERS
            // =====================================
            const drawHeaderFooter = (p: any) => {
                p.drawImage(headerImage, { x: 0, y: pageHeight - 100, width: pageWidth, height: 100 });
                p.drawImage(footerImage, { x: 0, y: 0, width: pageWidth, height: 45 });
            };

            const addNewPage = () => {
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                drawHeaderFooter(page);
                yPosition = pageHeight - 130;
                return page;
            };

            const cleanText = (text: any): string => {
                return String(text || '')
                    .replace(/&bull;/gi, '•')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/&amp;/gi, '&')
                    .replace(/&quot;/gi, '"')
                    .replace(/&#39;/gi, "'")
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<p[^>]*>/gi, '')
                    .replace(/<li[^>]*>/gi, '• ')
                    .replace(/<\/li>/gi, '\n')
                    .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
                    .replace(/<[^>]+>/g, '')
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .replace(/\t/g, ' ')
                    .replace(/[ \t]*\n[ \t]*/g, '\n')
                    .replace(/[ ]{2,}/g, ' ')
                    .replace(/\n{2,}/g, '\n\n')
                    .replace(/[^\x20-\x7E\n•]/g, '')
                    .trim();
            };

            const wrapText = (
                text: string,
                maxWidth: number,
                pdfFont: any,
                fontSize: number
            ): string[] => {
                const safeText = cleanText(text);
                if (!safeText) return [];

                const words = safeText.split(/\s+/);
                const lines: string[] = [];
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
                    const testWidth = pdfFont.widthOfTextAtSize(testLine, fontSize);

                    if (testWidth > maxWidth) {
                        if (currentLine.trim()) {
                            lines.push(currentLine.trim());
                        }
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }

                if (currentLine.trim()) {
                    lines.push(currentLine.trim());
                }
                return lines;
            };

            // Grid renderer mimicking the exact structured look of the quotation framework
            const drawTableGrid = (y: number, h: number, columnWidths: number[]) => {
                const tWidth = columnWidths.reduce((a, b) => a + b, 0);
                page.drawRectangle({
                    x: margin,
                    y: y - h + 10,
                    width: tWidth,
                    height: h,
                    borderColor: rgb(0.6, 0.6, 0.6),
                    borderWidth: 0.7
                });

                let currX = margin;
                for (let i = 0; i < columnWidths.length - 1; i++) {
                    currX += columnWidths[i];
                    page.drawLine({
                        start: { x: currX, y: y + 10 },
                        end: { x: currX, y: y - h + 10 },
                        thickness: 0.5,
                        color: rgb(0.75, 0.75, 0.75)
                    });
                }
            };

            // Initialize branding on Page 1
            drawHeaderFooter(page);

            // =====================================
            // CHALLAN METADATA HEADER (FIXED LAPOVER)
            // =====================================
            // =====================================
            // CHALLAN METADATA HEADER (CLEAN SIDE-BY-SIDE GRID)
            // =====================================
            page.drawText("DELIVERY CHALLAN", { x: 210, y: yPosition, size: 18, font: fontBold });
            yPosition -= 35;

            // --- Row 1: Challan No (Left) & Date (Right) ---
            page.drawText(`Challan No: ${challan.challanNumber}`, { x: margin, y: yPosition, size: 11, font: fontBold });

            const createdDate = challan.created_at ? new Date(challan.created_at) : new Date();
            const dateStr = `Date: ${createdDate.toLocaleDateString('en-GB')}`;
            const dateWidth = font.widthOfTextAtSize(dateStr, 11);
            page.drawText(dateStr, { x: pageWidth - margin - dateWidth, y: yPosition, size: 11, font });

            yPosition -= 20; // Step down to next row

            // Let's print Status on the right first so it stays locked parallel to the company line
            page.drawText(`Status: ${challan.challanStatus || 'N/A'}`, { x: 475, y: yPosition, size: 10, font });

            // Wrap Company Name safely on the left (Max width set to 320 to completely prevent crossing the right side)
            const cleanCompanyName = String(challan.companyName || '').replace(/[^\x20-\x7E]/g, '');
            const wrappedCompany = wrapText(`Company Name: ${cleanCompanyName}`, 320, fontBold, 11);

            let companyY = yPosition;
            wrappedCompany.forEach(line => {
                page.drawText(line, { x: margin, y: companyY, size: 11, font: fontBold });
                companyY -= 14;
            });

            // Dynamically calculate where the company lines ended
            const companyHeightDropped = yPosition - companyY;
            yPosition -= Math.max(companyHeightDropped, 18);

            // --- Row 3: Email (Sits cleanly right under the company block) ---
            page.drawText(`Email: ${challan.companyEmail || 'N/A'}`, { x: margin, y: yPosition, size: 10, font });

            yPosition -= 35; // Final gap before table header starts

            // =====================================
            // TABLE MATRIX PROPERTIES
            // =====================================
            // Metric splits total available width cleanly (515pt total canvas area)
            const cols = [30, 155, 95, 95, 50, 90];
            const colPositions = [
                margin,
                margin + 30,
                margin + 185,
                margin + 280,
                margin + 375,
                margin + 425
            ];

            const drawHeader = (y: number) => {
                // Header background accent box
                page.drawRectangle({
                    x: margin,
                    y: y - 12,
                    width: pageWidth - (margin * 2),
                    height: 22,
                    color: rgb(0.94, 0.94, 0.94)
                });
                drawTableGrid(y, 22, cols);

                page.drawText('SL', { x: colPositions[0] + 6, y: y - 2, size: 10, font: fontBold });
                page.drawText('Item Description', { x: colPositions[1] + 5, y: y - 2, size: 10, font: fontBold });
                page.drawText('Type', { x: colPositions[2] + 5, y: y - 2, size: 10, font: fontBold });
                page.drawText('Model', { x: colPositions[3] + 5, y: y - 2, size: 10, font: fontBold });
                page.drawText('Qty', { x: colPositions[4] + 8, y: y - 2, size: 10, font: fontBold });
                page.drawText('Remarks', { x: colPositions[5] + 5, y: y - 2, size: 10, font: fontBold });
            };

            drawHeader(yPosition);
            yPosition -= 22;

            // =====================================
            // RENDER ITEMS LOOP
            // =====================================
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                const itemLines = wrapText(item.itemName || '', cols[1] - 10, font, 9);
                const typeLines = wrapText(item.itemType || '', cols[2] - 10, font, 9);
                const modelLines = wrapText(item.itemModel || '', cols[3] - 10, font, 9);
                const noteLines = wrapText(item.notes || '', cols[5] - 10, font, 9);

                const maxLines = Math.max(itemLines.length, typeLines.length, modelLines.length, noteLines.length, 1);
                const rowHeight = Math.max(maxLines * 13 + 10, 28);

                // Dynamically evaluate bound break calculations
                if (yPosition - rowHeight < BOTTOM_LIMIT) {
                    addNewPage();
                    drawHeader(yPosition);
                    yPosition -= 22;
                }

                drawTableGrid(yPosition, rowHeight, cols);

                // Column 1: SL
                page.drawText(String(i + 1), { x: colPositions[0] + 8, y: yPosition - 4, size: 9, font });

                // Column 2: Item Description
                let currY = yPosition - 4;
                itemLines.forEach(l => {
                    page.drawText(l, { x: colPositions[1] + 5, y: currY, size: 9, font });
                    currY -= 12;
                });

                // Column 3: Type
                currY = yPosition - 4;
                typeLines.forEach(l => {
                    page.drawText(l, { x: colPositions[2] + 5, y: currY, size: 9, font });
                    currY -= 12;
                });

                // Column 4: Model
                currY = yPosition - 4;
                modelLines.forEach(l => {
                    page.drawText(l, { x: colPositions[3] + 5, y: currY, size: 9, font });
                    currY -= 12;
                });

                // Column 5: Qty
                page.drawText(String(item.deliveredQuantity || 0), { x: colPositions[4] + 12, y: yPosition - 4, size: 9, font });

                // Column 6: Remarks
                currY = yPosition - 4;
                noteLines.forEach(l => {
                    page.drawText(l, { x: colPositions[5] + 5, y: currY, size: 9, font });
                    currY -= 12;
                });

                yPosition -= rowHeight;
            }

            // =====================================
            // TAIL NOTE BLOCK SAFETY ELEVATION CHECK
            // =====================================
            const wrappedChallanNotes = wrapText(challan.notes || 'N/A', pageWidth - (margin * 2), font, 9);

            // Dynamic estimate: Remarks title/lines (40) + Signatures block (80) + Padding layout space (40)
            const finalBlockEstimate = 160 + (wrappedChallanNotes.length * 12);

            if (yPosition - finalBlockEstimate < BOTTOM_LIMIT) {
                addNewPage();
            }

            // =====================================
            // RENDERING REMARKS
            // =====================================
            yPosition -= 25;
            page.drawText("Remarks:", { x: margin, y: yPosition, size: 11, font: fontBold });
            yPosition -= 16;

            wrappedChallanNotes.forEach(line => {
                page.drawText(line, { x: margin, y: yPosition, size: 9, font });
                yPosition -= 12;
            });

            // =====================================
            // TRIPLE SIGNATURE MATRICES (CORRECTED)
            // =====================================
            const signatureY = 100;
            const lineLength = 110; // Length of each individual signature line

            // 1. Render the Individual Signature Lines above the text labels
            // Left Line (Prepared By)
            page.drawLine({
                start: { x: margin, y: signatureY + 20 },
                end: { x: margin + lineLength, y: signatureY + 20 },
                thickness: 0.8,
                color: rgb(0.5, 0.5, 0.5)
            });

            // Center Line (Received By)
            page.drawLine({
                start: { x: 240, y: signatureY + 20 },
                end: { x: 240 + lineLength, y: signatureY + 20 },
                thickness: 0.8,
                color: rgb(0.5, 0.5, 0.5)
            });

            // Right Line (Authorized Signature)
            page.drawLine({
                start: { x: 415, y: signatureY + 20 },
                end: { x: 415 + lineLength, y: signatureY + 20 },
                thickness: 0.8,
                color: rgb(0.5, 0.5, 0.5)
            });


            // 2. Render Signature Content (Names / Images) above the lines
            // Dynamic Creator Name for Prepared By
            const creatorName = challan.username || "System Generated";
            page.drawText(creatorName, {
                x: margin + 5,
                y: signatureY + 26,
                size: 10,
                font
            });

            // Authorized Signature Image on the far right
            // Lowering y slightly so the image sits elegantly right on top of the line
            page.drawImage(signatureImage, {
                x: 415 + 5,
                y: signatureY + 22,
                width: 80,
                height: 35
            });


            // 3. Render the bottom structural Title Labels
            page.drawText("Prepared By", { x: margin, y: signatureY, size: 10, font: fontBold });
            page.drawText("Received By", { x: 240, y: signatureY, size: 10, font: fontBold });
            page.drawText("Authorized Signature", { x: 415, y: signatureY, size: 10, font: fontBold });

            const pdfBytes = await pdfDoc.save();
            return { pdfBuffer: Buffer.from(pdfBytes) };

        } catch (error: any) {
            console.error("PDF Challan Generation Error:", error);
            throw new Error(`Failed to generate Challan PDF: ${error.message}`);
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