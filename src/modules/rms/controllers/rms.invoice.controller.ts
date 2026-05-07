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
        this.onPost("/rms/rms-invoice/create", [], this.auth.private, this.create);
        this.onPost("/rms/rms-invoice/create-from-quotation/:quotationId", [], this.auth.private, this.createFromQuotation);
        this.onPost("/rms/rms-invoice/create-from-challan/:challanId", [], this.auth.private, this.createFromChallan);
        this.onGet("/api/rms/rms-invoice/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-invoice/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-invoice/update/:id", [], this.auth.private, this.update);
        this.onDelete("/api/rms/rms-invoice/delete/:id", [], this.auth.private, this.delete);
        this.onGet("/api/rms/rms-invoice/generate-ref", [], this.auth.private, this.generateRef);
        this.onGet("/api/rms/rms-invoice/generate-pdf/:id", [], this.auth.private, this.generatePdf);
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

            const createdBy = req.user?.userId ? Number(req.user.userId) : undefined;

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

    // Create from quotation
    public async createFromQuotation(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const quotationId = Number(req.params.quotationId);
            const userId = req.user?.userId ? Number(req.user.userId) : undefined;

            if (!quotationId || isNaN(quotationId)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid quotation ID"
                });
            }

            const invoice = await this.rmsInvoiceService.createFromQuotation(quotationId, userId);

            return resp.status(201).json({
                status: true,
                message: "Invoice created from quotation successfully",
                data: invoice
            });

        } catch (error: any) {
            console.error(error);
            return resp.status(500).json({
                status: false,
                message: "Create from quotation failed",
                data: error.message
            });
        }
    }

    // Create from challan
    public async createFromChallan(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const challanId = Number(req.params.challanId);
            const userId = req.user?.userId ? Number(req.user.userId) : undefined;

            if (!challanId || isNaN(challanId)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid challan ID"
                });
            }

            const invoice = await this.rmsInvoiceService.createFromChallan(challanId, userId);

            return resp.status(201).json({
                status: true,
                message: "Invoice created from challan successfully",
                data: invoice
            });

        } catch (error: any) {
            console.error(error);
            return resp.status(500).json({
                status: false,
                message: "Create from challan failed",
                data: error.message
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

            const updatedBy = req.user?.userId ? Number(req.user.userId) : undefined;

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

    // Delete
    public async delete(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            const success = await this.rmsInvoiceService.delete(id);

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

            const invoiceNumber = await this.rmsInvoiceService.generateInvoiceNumber(
                String(companyName)
            );

            return resp.json({
                status: true,
                invoiceNumber
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
}