import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsTermsAndConditionsService } from "../services/rms.terms.and.conditions.service";


export class RmsTermsAndConditionsController extends Controller {

    private rmsTermsAndConditionsService: RmsTermsAndConditionsService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsTermsAndConditionsService = this.getService("RmsTermsAndConditionsService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-terms-and-conditions", [], this.auth.private, this.index);
        this.onPost("/rms/rms-terms-and-conditions/create", [], this.auth.private, this.create);
        this.onGet("/api/rms/rms-terms-and-conditions/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-terms-and-conditions/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-terms-and-conditions/update/:id", [], this.auth.private, this.update);
    }

    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        return resp.view("rms/rms-terms-and-conditions/index");
    }

    // ✅ CREATE RMS ITEM
    public async create(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const {
                timeLine,
                payment,
                warranty,
                remarks,
            } = req.body;


            const createdBy = req.user?.userId || 'system';

            console.log(timeLine, payment, warranty, remarks, createdBy);

            const result = await this.rmsTermsAndConditionsService.create({
                timeLine,
                payment,
                warranty,
                remarks,
                createdBy,
            });

            return resp.status(201).json({
                status: true,
                message: "RMS Terms and Conditions created successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Create RMS Terms and Conditions Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to create RMS Terms and Conditions",
                data: error.message,
            });
        }
    }

    // ✅ GET ALL WITH SEARCH + PAGINATION
    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const { search, page = 1, limit = 10 } = req.query;

            const searchStr = typeof search === "string" ? search.trim() : "";
            const pageNum = Math.max(Number(page), 1);
            const limitNum = Math.min(Math.max(Number(limit), 1), 100);

            const result = await this.rmsTermsAndConditionsService.getAll(
                searchStr,
                pageNum,
                limitNum
            );

            return resp.json({
                status: true,
                message: "RMS Terms and Conditions fetched successfully",
                ...result,
            });

        } catch (error: any) {
            console.error("GetAll RMS Terms and Conditions Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch RMS Terms and Conditions",
                data: error.message,
            });
        }
    }

    // ✅ EDIT SINGLE ITEM
    public async edit(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid item id",
                });
            }

            const result = await this.rmsTermsAndConditionsService.edit(id);

            return resp.json({
                status: true,
                message: "RMS Terms and Conditions fetched successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Edit RMS Terms and Conditions Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch RMS Terms and Conditions",
                data: error.message,
            });
        }
    }

    // ✅ UPDATE ITEM
    public async update(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid RMS Terms and Conditions id",
                });
            }

            // 🔥 Get existing item first
            const existing = await this.rmsTermsAndConditionsService.edit(id);

            if (!existing) {
                return resp.status(404).json({
                    status: false,
                    message: "RMS Terms and Conditions not found",
                });
            }

            // 🔥 Get body values
            const {
                timeLine,
                payment,
                warranty,
                remarks,
            } = req.body;

            const updatedBy = req.user?.userId || "system";

            // ✅ Prevent null overwrite
            const result = await this.rmsTermsAndConditionsService.update(id, {
                timeLine: timeLine ?? existing.timeLine,
                payment: payment ?? existing.payment,
                warranty: warranty ?? existing.warranty,
                remarks: remarks ?? existing.remarks,
                updatedBy,
            });

            return resp.json({
                status: true,
                message: "RMS Terms and Conditions updated successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Update RMS Terms and Conditions Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to update RMS Terms and Conditions",
                data: error.message,
            });
        }
    }
}