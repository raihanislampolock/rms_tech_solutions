import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsDeliveryService } from "../services/rms.delivery.service";

export class RmsDeliveryController extends Controller {

    private rmsDeliveryService: RmsDeliveryService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsDeliveryService = this.getService("RmsDeliveryService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-delivery", [], this.auth.private, this.index);
        this.onPost("/rms/rms-delivery/create", [], this.auth.private, this.create);
        this.onPost("/rms/rms-delivery/create-from-quotation/:quotationId", [], this.auth.private, this.createFromQuotation);
        this.onGet("/api/rms/rms-delivery/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-delivery/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-delivery/update/:id", [], this.auth.private, this.update);
        this.onDelete("/api/rms/rms-delivery/delete/:id", [], this.auth.private, this.delete);
        this.onGet("/api/rms/rms-delivery/generate-ref", [], this.auth.private, this.generateRef);
        this.onGet("/api/rms/rms-delivery/generate-pdf/:id", [], this.auth.private, this.generatePdf);
    }

    // Page
    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const items = await this.rmsDeliveryService.getItemDropdown();

            return resp.view("rms/rms-delivery/index", {
                items
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-delivery/index", {
                items: []
            });
        }
    }

    // Create
    public async create(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const {
                deliveryNumber,
                quotationId,
                companyName,
                companyEmail,
                notes,
                deliveryStatus,
                items
            } = req.body;

            if (!deliveryNumber || !companyName || !items?.length) {
                return resp.status(400).json({
                    status: false,
                    message: "Required fields missing"
                });
            }

            const createdBy = req.user?.userId ? Number(req.user.userId) : undefined;

            await this.rmsDeliveryService.create({
                deliveryNumber,
                quotationId,
                companyName,
                companyEmail,
                notes,
                deliveryStatus,
                createdBy,
                items
            });

            return resp.status(201).json({
                status: true,
                message: "Delivery created successfully"
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

            const delivery = await this.rmsDeliveryService.createFromQuotation(quotationId, userId);

            return resp.status(201).json({
                status: true,
                message: "Delivery created from quotation successfully",
                data: delivery
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

    // Get all
    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const { search, page = 1, limit = 10 } = req.query;

            const result = await this.rmsDeliveryService.getAll(
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
                    message: "Invalid delivery ID"
                });
            }

            const delivery = await this.rmsDeliveryService.edit(id);

            return resp.json({
                status: true,
                data: delivery
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
                deliveryNumber,
                quotationId,
                companyName,
                companyEmail,
                notes,
                deliveryStatus,
                items
            } = req.body;

            const updatedBy = req.user?.userId ? Number(req.user.userId) : undefined;

            await this.rmsDeliveryService.update(
                id,
                {
                    deliveryNumber,
                    quotationId,
                    companyName,
                    companyEmail,
                    notes,
                    deliveryStatus,
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

            const success = await this.rmsDeliveryService.delete(id);

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

            const deliveryNumber = await this.rmsDeliveryService.generateDeliveryNumber(
                String(companyName)
            );

            return resp.json({
                status: true,
                deliveryNumber
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
                    message: "Invalid delivery ID"
                });
            }

            const result = await this.rmsDeliveryService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `attachment; filename=delivery-challan-${id}.pdf`);
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