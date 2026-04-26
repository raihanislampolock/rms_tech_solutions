import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsQuotationService } from "../services/rms.quotation.service";

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
        this.onPost("/api/rms/rms-quotation/send-email/:id", [], this.auth.private, this.sendEmailWithPdf);
    }

    // ✅ PAGE
    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const items = await this.rmsQuotationService.getItemDropdown();

            return resp.view("rms/rms-quotation/index", {
                items
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-quotation/index", {
                items: []
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
                createdBy,
                items
            });

            return resp.status(201).json({
                status: true,
                message: "Quotation created successfully"
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
                items
            } = req.body;

            const updatedBy = req.user?.userId || "system";

            await this.rmsQuotationService.update(
                id,
                {
                    refNumber,
                    companyName,
                    companyEmail,
                    subject,
                    discriptions,
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
}