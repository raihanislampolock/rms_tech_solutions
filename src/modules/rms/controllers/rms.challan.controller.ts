import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsChallanService } from "../services/rms.challan.service";

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
        this.onPost("/rms/rms-challan/create-from-quotation/:quotationId", [], this.auth.private, this.createFromQuotation);
        this.onGet("/api/rms/rms-challan/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-challan/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-challan/update/:id", [], this.auth.private, this.update);
        this.onDelete("/api/rms/rms-challan/delete/:id", [], this.auth.private, this.delete);
        this.onGet("/api/rms/rms-challan/generate-ref", [], this.auth.private, this.generateRef);
        this.onGet("/api/rms/rms-challan/generate-pdf/:id", [], this.auth.private, this.generatePdf);
        this.onGet("/api/rms/rms-challan/view-pdf/:id", [], this.auth.private, this.viewPdf);
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
            const quotationId = Number(req.params.quotationId);
            const userId = req.user?.userId ? Number(req.user.userId) : undefined;

            if (!quotationId || isNaN(quotationId)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid quotation ID"
                });
            }

            const challan = await this.rmsChallanService.createFromQuotation(quotationId, userId);

            return resp.status(201).json({
                status: true,
                message: "Challan created from quotation successfully",
                data: challan
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
}