import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsQuotationService } from "../services/rms.quotation.service";
import ExcelJS from "exceljs";

export class RmsQuotationController extends Controller {

    private rmsQuotationService: RmsQuotationService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsQuotationService = this.getService("RmsQuotationService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-quotation", [], this.auth.private, this.index);
        this.onPost("/rms/rms-quotation/create", [], this.auth.private, this.create);
        this.onGet("/api/rms/rms-quotation/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-quotation/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-quotation/update/:id", [], this.auth.private, this.update);
        this.onGet("/api/rms/rms-quotation/generate-ref", [], this.auth.private, this.generateRef);
        this.onGet("/api/rms/rms-quotation/generate-pdf/:id", [], this.auth.private, this.generatePdf);
        this.onGet("/api/rms/rms-quotation/view-pdf/:id", [], this.auth.private, this.viewPdf);
        this.onPost("/api/rms/rms-quotation/send-email/:id", [], this.auth.private, this.sendEmailWithPdf);
        this.onGet("/api/rms/rms-quotation/export/excel", [], this.auth.private, this.exportExcel);
    }

    // ✅ PAGE
    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const items = await this.rmsQuotationService.getItemDropdown();
            const termsConditions = await this.rmsQuotationService.getTermsConditionDropdown();

            return resp.view("rms/rms-quotation/index", {
                items,
                termsConditions
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-quotation/index", {
                items: [],
                termsConditions: []
            });
        }
    }

    // ✅ CREATE (FIXED)
    public async create(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const {
                refNumber,
                companyName,
                companyEmail,
                subject,
                discriptions,
                termsConditionId,
                items
            } = req.body;

            if (!refNumber || !companyName || !items?.length) {
                return resp.status(400).json({
                    status: false,
                    message: "Required fields missing"
                });
            }

            const createdBy = req.user?.userId || "system";

            await this.rmsQuotationService.create({
                refNumber,
                companyName,
                companyEmail,
                subject,
                discriptions,
                termsConditionId,
                createdBy,
                items
            });

            return resp.status(201).json({
                status: true,
                message: ""
            });

        } catch (error: any) {
            console.error(error);
            return resp.status(500).json({
                status: false,
                message: "Create failed",
                data: error.message
            });
        }
    }

    // ✅ GET ALL (OK)
    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const { search, page = 1, limit = 10 } = req.query;

            const result = await this.rmsQuotationService.getAll(
                typeof search === "string" ? search.trim() : "",
                Number(page),
                Number(limit)
            );

            return resp.json({
                status: true,
                message: "Fetched successfully",
                ...result
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // ✅ EDIT (FIXED)
    public async edit(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const rawId = req.params.id;

            const id = Number(rawId);

            // ✅ VALIDATION (IMPORTANT)
            if (!rawId || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid quotation ID"
                });
            }

            const quotation = await this.rmsQuotationService.edit(id);

            return resp.json({
                status: true,
                data: quotation
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // ✅ UPDATE (FIXED - ONE CALL ONLY)
    public async update(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            const {
                refNumber,
                companyName,
                companyEmail,
                subject,
                discriptions,
                termsConditionId,
                items
            } = req.body;

            const updatedBy = req.user?.userId || "system";

            console.log("termsConditionId:", termsConditionId); // 👈 CHECK IF VALUE RECEIVED

            await this.rmsQuotationService.update(
                id,
                {
                    refNumber,
                    companyName,
                    companyEmail,
                    subject,
                    discriptions,
                    termsConditionId,
                    updatedBy
                },
                items
            );

            return resp.json({
                status: true,
                message: ""
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    public async generateRef(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {

            const companyName = req.query.companyName || "TEMP";

            const refNumber = await this.rmsQuotationService.generateRefNumber(
                String(companyName)
            );

            return resp.json({
                status: true,
                refNumber
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    public async generatePdf(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const rawId = req.params.id;

            const id = Number(rawId);

            // ✅ VALIDATION
            if (!rawId || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid quotation ID"
                });
            }

            const result = await this.rmsQuotationService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `attachment; filename=quotation-${id}.pdf`);
            return resp.send(result.pdfBuffer);

        } catch (error: any) {
            console.error(error);
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    public async sendEmailWithPdf(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const rawId = req.params.id;
            const id = Number(rawId);

            // ✅ VALIDATION
            if (!rawId || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid quotation ID"
                });
            }

            // Get quotation data
            const quotation = await this.rmsQuotationService.edit(id);
            if (!quotation) {
                return resp.status(404).json({
                    status: false,
                    message: "Quotation not found"
                });
            }

            // Check if email exists
            if (!quotation.companyEmail) {
                return resp.status(400).json({
                    status: false,
                    message: "Company email not found"
                });
            }

            // Generate PDF
            const pdfResult = await this.rmsQuotationService.generatePdf(id);

            // Send email with PDF
            const QuotationEmailService = require("../../../utils/quotation-email.service").QuotationEmailService;
            const emailService = new QuotationEmailService();

            await emailService.sendQuotationPdf(
                quotation.companyEmail,
                quotation.companyName,
                pdfResult.pdfBuffer,
                quotation.refNumber
            );

            return resp.json({
                status: true,
                message: `✅ Email sent successfully to ${quotation.companyEmail}`
            });

        } catch (error: any) {
            console.error('Error sending email:', error);
            return resp.status(500).json({
                status: false,
                message: error.message || "Failed to send email"
            });
        }
    }

    public async viewPdf(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const rawId = req.params.id;
            const id = Number(rawId);

            if (!rawId || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid quotation ID"
                });
            }

            const result = await this.rmsQuotationService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `inline; filename=quotation-${id}.pdf`);
            return resp.send(result.pdfBuffer);

        } catch (error: any) {
            console.error(error);
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    public async exportExcel(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {
        try {
            const { search } = req.query;

            const searchStr =
                typeof search === "string"
                    ? search.trim()
                    : "";

            const { data }: { data: any[] } =
                await this.rmsQuotationService.getAll(
                    searchStr,
                    1,
                    1000000
                );

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("RMS Quotations");

            worksheet.columns = [
                { header: "Quotation Ref No", key: "refNumber", width: 25 },

                { header: "Company Name", key: "companyName", width: 35 },
                { header: "Company Email", key: "companyEmail", width: 35 },

                { header: "Subject", key: "subject", width: 40 },
                { header: "Description", key: "discriptions", width: 60 },

                { header: "Timeline", key: "timeLine", width: 25 },
                { header: "Payment Terms", key: "payment", width: 40 },
                { header: "Warranty", key: "warranty", width: 30 },
                { header: "Remarks", key: "remarks", width: 40 },

                { header: "Item Name", key: "itemName", width: 30 },
                { header: "Item Type", key: "itemType", width: 20 },
                { header: "Item Model", key: "itemModel", width: 25 },
                { header: "Manufacture Origin", key: "manufactureOrigin", width: 25 },

                { header: "Quantity", key: "quarterly", width: 15 },

                { header: "Item Price", key: "itemPrice", width: 18 },
                { header: "RMS Price", key: "rmsPrice", width: 18 },

                { header: "Total Item Price", key: "totalItemPrice", width: 20 },
                { header: "Total RMS Price", key: "totalRmsPrice", width: 20 },

                { header: "Item Configurations", key: "itemConfigurations", width: 80 },

                { header: "Files", key: "files", width: 40 },

                { header: "Created By", key: "createdBy", width: 15 },
                { header: "Updated By", key: "updatedBy", width: 15 },

                { header: "Created At", key: "createdAt", width: 25 },
                { header: "Updated At", key: "updatedAt", width: 25 }
            ];

            // One row per item
            data.forEach((row: any) => {
                worksheet.addRow({
                    refNumber: row.refNumber ?? "",

                    companyName: row.companyName ?? "",
                    companyEmail: row.companyEmail ?? "",

                    subject: row.subject ?? "",
                    discriptions: row.discriptions ?? "",

                    timeLine: row.timeLine ?? "",
                    payment: row.payment ?? "",
                    warranty: row.warranty ?? "",
                    remarks: row.remarks ?? "",

                    itemName: row.itemName ?? "",
                    itemType: row.itemType ?? "",
                    itemModel: row.itemModel ?? "",
                    manufactureOrigin: row.manufactureOrigin ?? "",

                    quarterly: row.quarterly ?? 0,

                    itemPrice: row.itemPrice ?? 0,
                    rmsPrice: row.rmsPrice ?? 0,

                    totalItemPrice: row.totalItemPrice ?? 0,
                    totalRmsPrice: row.totalRmsPrice ?? 0,

                    itemConfigurations: row.itemConfigurations ?? "",

                    files: Array.isArray(row.files)
                        ? row.files.join(", ")
                        : row.files ?? "",

                    createdBy: row.createdBy ?? "",
                    updatedBy: row.updatedBy ?? "",

                    createdAt: row.created_at
                        ? new Date(row.created_at).toLocaleString()
                        : "",

                    updatedAt: row.updated_at
                        ? new Date(row.updated_at).toLocaleString()
                        : ""
                });
            });

            // Header Style
            const headerRow = worksheet.getRow(1);

            headerRow.eachCell((cell) => {
                cell.font = {
                    bold: true,
                    color: { argb: "FFFFFFFF" }
                };

                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb: "580DB4"
                    }
                };

                cell.alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });

            worksheet.eachRow((row, rowNumber) => {
                row.height = 22;

                if (rowNumber > 1) {
                    row.eachCell((cell) => {
                        cell.alignment = {
                            vertical: "middle",
                            wrapText: true
                        };
                    });
                }
            });

            worksheet.views = [
                {
                    state: "frozen",
                    ySplit: 1
                }
            ];

            resp.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            resp.setHeader(
                "Content-Disposition",
                `attachment; filename=rms_quotations_${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(resp);

            resp.end();
        } catch (error: any) {
            console.error(
                "Error exporting RMS Quotation Excel:",
                error
            );

            return resp.status(500).json({
                status: false,
                message:
                    "An error occurred while exporting RMS Quotation Excel",
                error: error.message
            });
        }
    }
}