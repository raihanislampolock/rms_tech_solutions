import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsChallanService } from "../services/rms.challan.service";
import ExcelJS from "exceljs";

export class RmsChallanController extends Controller {

    private rmsChallanService: RmsChallanService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsChallanService = this.getService("RmsChallanService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-challan", [], this.auth.private, this.index);
        this.onGet("/rms/rms-challan/create", [], this.auth.private, this.createPage);
        this.onPost("/api/rms/rms-challan/create", [], this.auth.private, this.create);
        this.onPost("/rms/rms-challan/create-from-quotation/:refNumber", [], this.auth.private, this.createFromQuotation);
        this.onGet("/api/rms/rms-challan/load-from-quotation/:refNumber", [], this.auth.private, this.loadFromQuotation);
        this.onGet("/api/rms/rms-challan/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-challan/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-challan/update/:id", [], this.auth.private, this.update);
        this.onDelete("/api/rms/rms-challan/delete/:id", [], this.auth.private, this.delete);
        this.onGet("/api/rms/rms-challan/generate-ref", [], this.auth.private, this.generateRef);
        this.onGet("/api/rms/rms-challan/generate-pdf/:id", [], this.auth.private, this.generatePdf);
        this.onGet("/api/rms/rms-challan/view-pdf/:id", [], this.auth.private, this.viewPdf);
        this.onPost("/api/rms/rms-challan/send-email/:id", [], this.auth.private, this.sendEmailWithPdf);
        this.onGet("/api/rms/rms-challan/export/excel", [], this.auth.private, this.exportExcel);
    }

    // Page
    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const items = await this.rmsChallanService.getItemDropdown();

            return resp.view("rms/rms-challan/index", {
                items
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-challan/index", {
                items: []
            });
        }
    }

    // Create Page
    public async createPage(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const items = await this.rmsChallanService.getItemDropdown();

            return resp.view("rms/rms-challan/create", {
                items
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-challan/create", {
                items: []
            });
        }
    }

    // Create
    public async create(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const {
                challanNumber,
                quotationId,
                companyName,
                companyEmail,
                notes,
                challanStatus,
                items
            } = req.body;

            if (!challanNumber || !companyName || !items?.length) {
                return resp.status(400).json({
                    status: false,
                    message: "Required fields missing"
                });
            }

            const createdBy = req.user?.userId || 'system';

            await this.rmsChallanService.create({
                challanNumber,
                quotationId,
                companyName,
                companyEmail,
                notes,
                challanStatus,
                createdBy,
                items
            });

            return resp.status(201).json({
                status: true,
                message: "Challan created successfully"
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

    // Create from quotation
    public async createFromQuotation(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
            try {

            const refNumber = req.params.refNumber;

            const data = await this.rmsChallanService.createFromQuotation(refNumber);

            return resp.status(200).json({
                status: true,
                data
            });

        } catch (error: any) {

            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // Load quotation without creating challan
    public async loadFromQuotation(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const refNumber = req.params.refNumber;
            const data = await this.rmsChallanService.getQuotationForChallan(refNumber);

            return resp.status(200).json({
                status: true,
                data
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // Get all
    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const { search, page = 1, limit = 10 } = req.query;

            const result = await this.rmsChallanService.getAll(
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

    // Edit
    public async edit(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const rawId = req.params.id;
            const id = Number(rawId);

            if (!rawId || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid challan ID"
                });
            }

            const challan = await this.rmsChallanService.edit(id);

            return resp.json({
                status: true,
                data: challan
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // Update
    public async update(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            const {
                challanNumber,
                quotationId,
                companyName,
                companyEmail,
                notes,
                challanStatus,
                items
            } = req.body;

            const updatedBy = req.user?.userId || 'system';

            await this.rmsChallanService.update(
                id,
                {
                    challanNumber,
                    quotationId,
                    companyName,
                    companyEmail,
                    notes,
                    challanStatus,
                    updatedBy
                },
                items
            );

            return resp.json({
                status: true,
                message: "Updated successfully"
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // Delete
    public async delete(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            const success = await this.rmsChallanService.delete(id);

            if (success) {
                return resp.json({
                    status: true,
                    message: "Deleted successfully"
                });
            } else {
                return resp.status(500).json({
                    status: false,
                    message: "Delete failed"
                });
            }

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // Generate ref
    public async generateRef(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const companyName = req.query.companyName || "TEMP";

            const challanNumber = await this.rmsChallanService.generateChallanNumber(
                String(companyName)
            );

            return resp.json({
                status: true,
                challanNumber
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // Generate PDF
    public async generatePdf(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const rawId = req.params.id;
            const id = Number(rawId);

            if (!rawId || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid challan ID"
                });
            }

            const result = await this.rmsChallanService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `attachment; filename=challan-${id}.pdf`);
            return resp.send(result.pdfBuffer);

        } catch (error: any) {
            console.error(error);
            return resp.status(500).json({
                status: false,
                message: error.message
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
                    message: "Invalid challan ID"
                });
            }

            const result = await this.rmsChallanService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `inline; filename=challan-${id}.pdf`);
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
                    message: "Invalid invoice ID"
                });
            }

            // Get challan data
            const challan = await this.rmsChallanService.edit(id);
            if (!challan) {
                return resp.status(404).json({
                    status: false,
                    message: "Challan not found"
                });
            }

            // Check if email exists
            if (!challan.companyEmail) {
                return resp.status(400).json({
                    status: false,
                    message: "Company email not found"
                });
            }

            // Generate PDF
            const pdfResult = await this.rmsChallanService.generatePdf(id);

            // Send email with PDF
            const ChallanEmailService = require("../../../utils/challan-email-service").ChallanEmailService;
            const emailService = new ChallanEmailService();

            await emailService.sendChallanPdf(
                challan.companyEmail,
                challan.companyName,
                pdfResult.pdfBuffer,
                challan.challanNumber
            );

            return resp.json({
                status: true,
                message: `✅ Email sent successfully to ${challan.companyEmail}`
            });

        } catch (error: any) {
            console.error('Error sending email:', error);
            return resp.status(500).json({
                status: false,
                message: error.message || "Failed to send email"
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
                await this.rmsChallanService.getAll(
                    searchStr,
                    1,
                    1000000
                );

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("RMS Challans");

            worksheet.columns = [
                { header: "Challan No", key: "challanNumber", width: 25 },
                { header: "Quotation ID", key: "quotationId", width: 15 },

                { header: "Company Name", key: "companyName", width: 35 },
                { header: "Company Email", key: "companyEmail", width: 35 },

                { header: "Challan Notes", key: "challanNotes", width: 40 },
                { header: "Item Notes", key: "itemNotes", width: 40 },

                { header: "Challan Status", key: "challanStatus", width: 20 },

                { header: "Item ID", key: "itemId", width: 15 },
                { header: "Item Name", key: "itemName", width: 30 },
                { header: "Item Type", key: "itemType", width: 20 },
                { header: "Item Model", key: "itemModel", width: 25 },
                { header: "Manufacture Origin", key: "manufactureOrigin", width: 25 },

                { header: "Available Stock", key: "availableStock", width: 18 },
                { header: "Delivered Quantity", key: "deliveredQuantity", width: 18 },

                { header: "Item Price", key: "itemPrice", width: 18 },

                { header: "Item Configurations", key: "itemConfigurations", width: 80 },

                { header: "Created By", key: "createdBy", width: 15 },
                { header: "Updated By", key: "updatedBy", width: 15 },

                { header: "Created At", key: "createdAt", width: 25 },
                { header: "Updated At", key: "updatedAt", width: 25 }
            ];

            // One row per item
            data.forEach((row: any) => {
                worksheet.addRow({
                    challanNumber: row.challanNumber ?? "",
                    quotationId: row.quotationId ?? "",

                    companyName: row.companyName ?? "",
                    companyEmail: row.companyEmail ?? "",

                    challanNotes: row.challanNotes ?? "",
                    itemNotes: row.itemNotes ?? "",

                    challanStatus: row.challanStatus ?? "",

                    itemId: row.itemId ?? "",
                    itemName: row.itemName ?? "",
                    itemType: row.itemType ?? "",
                    itemModel: row.itemModel ?? "",
                    manufactureOrigin: row.manufactureOrigin ?? "",

                    availableStock: row.availableStock ?? 0,
                    deliveredQuantity: row.deliveredQuantity ?? 0,

                    itemPrice: row.itemPrice ?? 0,

                    itemConfigurations:
                        typeof row.itemConfigurations === "object"
                            ? JSON.stringify(row.itemConfigurations, null, 2)
                            : row.itemConfigurations ?? "",

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
                `attachment; filename=rms_challan_${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(resp);

            resp.end();
        } catch (error: any) {
            console.error(
                "Error exporting RMS Challan Excel:",
                error
            );

            return resp.status(500).json({
                status: false,
                message:
                    "An error occurred while exporting RMS Challan Excel",
                error: error.message
            });
        }
    }
}