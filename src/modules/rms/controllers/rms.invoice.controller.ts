import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsInvoiceService } from "../services/rms.invoice.service";

export class RmsInvoiceController extends Controller {

    private rmsInvoiceService: RmsInvoiceService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsInvoiceService = this.getService("RmsInvoiceService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-invoice", [], this.auth.private, this.index);
        this.onGet("/rms/rms-invoice/create", [], this.auth.private, this.createPage);
        this.onPost("/api/rms/rms-invoice/create", [], this.auth.private, this.create);
        this.onGet("/api/rms/rms-invoice/load-from-quotation/:refNumber", [], this.auth.private, this.loadFromQuotation);
        this.onGet("/api/rms/rms-invoice/load-from-challan/:challanNumber", [], this.auth.private, this.createFromChallan);
        this.onGet("/api/rms/rms-invoice/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-invoice/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-invoice/update/:id", [], this.auth.private, this.update);
        this.onGet("/api/rms/rms-invoice/generate-ref", [], this.auth.private, this.generateRef);
        this.onGet("/api/rms/rms-invoice/generate-pdf/:id", [], this.auth.private, this.generatePdf);
        this.onGet("/api/rms/rms-invoice/view-pdf/:id", [], this.auth.private, this.viewPdf);
        this.onPost("/api/rms/rms-invoice/send-email/:id", [], this.auth.private, this.sendEmailWithPdf);
    }

    // Page
    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const items = await this.rmsInvoiceService.getItemDropdown();

            return resp.view("rms/rms-invoice/index", {
                items
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-invoice/index", {
                items: []
            });
        }
    }

    // Create Page
    public async createPage(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const items = await this.rmsInvoiceService.getItemDropdown();

            return resp.view("rms/rms-invoice/create", {
                items
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-invoice/create", {
                items: []
            });
        }
    }

    // Create
    public async create(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const {
                invoiceNumber,
                quotationId,
                challanId,
                companyName,
                companyEmail,
                notes,
                invoiceStatus,
                taxAmount,
                discountAmount,
                items
            } = req.body;

            if (!invoiceNumber || !companyName || !items?.length) {
                return resp.status(400).json({
                    status: false,
                    message: "Required fields missing"
                });
            }

            const createdBy = req.user?.userId || 'system';

            await this.rmsInvoiceService.create({
                invoiceNumber,
                quotationId,
                challanId,
                companyName,
                companyEmail,
                notes,
                invoiceStatus,
                taxAmount: taxAmount ? parseFloat(taxAmount) : 0,
                discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
                createdBy,
                items
            });

            return resp.status(201).json({
                status: true,
                message: "Invoice created successfully"
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

    // Create from challan
    public async createFromChallan(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const challanNumber = req.params.challanNumber;
            const data = await this.rmsInvoiceService.createFromChallan(challanNumber);

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

            const result = await this.rmsInvoiceService.getAll(
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
                    message: "Invalid invoice ID"
                });
            }

            const invoice = await this.rmsInvoiceService.edit(id);

            return resp.json({
                status: true,
                data: invoice
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
                invoiceNumber,
                quotationId,
                challanId,
                companyName,
                companyEmail,
                notes,
                invoiceStatus,
                taxAmount,
                discountAmount,
                items
            } = req.body;

            const updatedBy = req.user?.userId || 'system';

            await this.rmsInvoiceService.update(
                id,
                {
                    invoiceNumber,
                    quotationId,
                    challanId,
                    companyName,
                    companyEmail,
                    notes,
                    invoiceStatus,
                    taxAmount: taxAmount ? parseFloat(taxAmount) : 0,
                    discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
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

    // Generate ref
    public async generateRef(req: HttpRequest, resp: HttpResponse) {
        try {
            console.log("GENERATE REF HIT");

            const companyName = req.query.companyName || "TEMP";

            const invoiceNumber =
                await this.rmsInvoiceService.generateInvoiceNumber(
                    String(companyName)
                );

            console.log("INVOICE GENERATED:", invoiceNumber);

            return resp.json({
                status: true,
                invoiceNumber
            });

        } catch (error: any) {

            console.error("GENERATE REF ERROR:", error);

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
                    message: "Invalid invoice ID"
                });
            }

            const result = await this.rmsInvoiceService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
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
                    message: "Invalid invoice ID"
                });
            }

            const result = await this.rmsInvoiceService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `inline; filename=invoice-${id}.pdf`);
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

            // Get invoice data
            const invoice = await this.rmsInvoiceService.edit(id);
            if (!invoice) {
                return resp.status(404).json({
                    status: false,
                    message: "Invoice not found"
                });
            }

            // Check if email exists
            if (!invoice.companyEmail) {
                return resp.status(400).json({
                    status: false,
                    message: "Company email not found"
                });
            }

            // Generate PDF
            const pdfResult = await this.rmsInvoiceService.generatePdf(id);

            // Send email with PDF
            const InvoiceEmailService = require("../../../utils/invoice-email.service").InvoiceEmailService;
            const emailService = new InvoiceEmailService();

            await emailService.sendInvoicePdf(
                invoice.companyEmail,
                invoice.companyName,
                pdfResult.pdfBuffer,
                invoice.invoiceNumber
            );

            return resp.json({
                status: true,
                message: `✅ Email sent successfully to ${invoice.companyEmail}`
            });

        } catch (error: any) {
            console.error('Error sending email:', error);
            return resp.status(500).json({
                status: false,
                message: error.message || "Failed to send email"
            });
        }
    }

    public async loadFromQuotation(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const refNumber = req.params.refNumber;
            const data = await this.rmsInvoiceService.getQuotationForInvoice(refNumber);

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
}