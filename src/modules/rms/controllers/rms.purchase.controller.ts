import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsPurchaseService } from "../services/rms.purchase.service";
import { upload } from "../../../middlewares/upload";
import fs from "fs";
import path from "path";

export class RmsPurchaseController extends Controller {

    private rmsPurchaseService: RmsPurchaseService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsPurchaseService = this.getService("RmsPurchaseService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-purchase", [], this.auth.private, this.index);
        this.onPost("/api/rms/rms-purchase/create", [upload.single("file")], this.auth.private, this.create);
        this.onGet("/api/rms/rms-purchase/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-purchase/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-purchase/update/:id", [upload.single("file")], this.auth.private, this.update);
        this.onGet("/api/rms/rms-purchase/generate-number", [], this.auth.private, this.generateNumber);
        this.onGet("/api/rms/rms-purchase/generate-pdf/:id", [], this.auth.private, this.generatePdf);
    }

    // ===============================
    // ✅ PAGE LOAD
    // ===============================
    public async index(req: HttpRequest, resp: HttpResponse) {
        try {
            const items = await this.rmsPurchaseService.getItemDropdown();

            return resp.view("rms/rms-purchase/index", {
                items
            });

        } catch (error) {
            console.error(error);
            return resp.view("rms/rms-purchase/index", {
                items: []
            });
        }
    }

    // ===============================
    // ✅ CREATE
    // ===============================
    public async create(req: HttpRequest, resp: HttpResponse) {
        try {
            const {
                purchaseNumber,
                supplierName,
                supplierEmail,
                purchaseStatus,
                notes,
                items
            } = req.body;

            const itemsArray = typeof items === 'string' ? JSON.parse(items) : items;

            // ✅ VALIDATION
            if (!purchaseNumber || !itemsArray?.length) {
                return resp.status(400).json({
                    status: false,
                    message: "Purchase number and items are required"
                });
            }

            const file = (req as any).file;

            let filePath: string | null = null;
            if (file) {
                filePath = `uploads/${file.filename}`;
            }

            const createdBy = req.user?.userId || "system";

            await this.rmsPurchaseService.create({
                purchaseNumber,
                supplierName,
                supplierEmail,
                purchaseStatus,
                notes,
                files: filePath,
                createdBy,
                items: itemsArray
            });

            return resp.status(201).json({
                status: true,
                message: "Purchase created successfully"
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

    // ===============================
    // ✅ GET ALL
    // ===============================
    public async getAll(req: HttpRequest, resp: HttpResponse) {
        try {
            const { search, page = 1, limit = 10 } = req.query;

            const result = await this.rmsPurchaseService.getAll(
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

    // ===============================
    // ✅ EDIT
    // ===============================
    public async edit(req: HttpRequest, resp: HttpResponse) {
        try {
            const id = Number(req.params.id);

            if (!req.params.id || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid purchase ID"
                });
            }

            const purchase = await this.rmsPurchaseService.edit(id);

            return resp.json({
                status: true,
                data: purchase
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // ===============================
    // ✅ UPDATE
    // ===============================
    public async update(req: HttpRequest, resp: HttpResponse) {
        try {
            const id = Number(req.params.id);

            if (!req.params.id || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid purchase ID"
                });
            }

            const {
                supplierName,
                supplierEmail,
                purchaseStatus,
                notes,
                items
            } = req.body;

            const itemsArray = typeof items === 'string' ? JSON.parse(items) : items;

            const existing = await this.rmsPurchaseService.edit(id);
            if (!existing) {
                return resp.status(404).json({
                    status: false,
                    message: "Purchase not found"
                });
            }

            const file = (req as any).file;
            let filePath: string | null = existing.files || null;

            if (file) {
                if (existing.files) {
                    const oldPath = path.join(process.cwd(), existing.files);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
                filePath = `uploads/${file.filename}`;
            }

            const updatedBy = req.user?.userId || "system";

            await this.rmsPurchaseService.update(
                id,
                {
                    supplierName,
                    supplierEmail,
                    purchaseStatus,
                    notes,
                    files: filePath,
                    updatedBy
                },
                itemsArray
            );

            return resp.json({
                status: true,
                message: "Updated successfully"
            });

        } catch (error: any) {
            console.error(error);
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // ===============================
    // 🔢 GENERATE PURCHASE NUMBER
    // ===============================
    public async generateNumber(req: HttpRequest, resp: HttpResponse) {
        try {
            const supplierCode = req.query.supplierCode || "GEN";

            const purchaseNumber =
                await this.rmsPurchaseService.generatePurchaseNumber(
                    String(supplierCode)
                );

            return resp.json({
                status: true,
                purchaseNumber
            });

        } catch (error: any) {
            return resp.status(500).json({
                status: false,
                message: error.message
            });
        }
    }

    // ===============================
    // 🔢 GENERATE PDF
    // ===============================
    public async generatePdf(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const rawId = req.params.id;

            const id = Number(rawId);

            // ✅ VALIDATION
            if (!rawId || isNaN(id)) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid purchase ID"
                });
            }

            const result = await this.rmsPurchaseService.generatePdf(id);

            resp.setHeader('Content-Type', 'application/pdf');
            resp.setHeader('Content-Disposition', `attachment; filename=purchase-${id}.pdf`);
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