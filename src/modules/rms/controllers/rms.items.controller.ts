import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsItemsService } from "../services/rms.items.service";
import { upload } from "../../../middlewares/upload";
import fs from "fs";
import path from "path";

export class RmsItemsController extends Controller {

    private rmsItemsService: RmsItemsService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsItemsService = this.getService("RmsItemsService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-items", [], this.auth.private, this.index);
        this.onPost("/rms/rms-items/create", [upload.single("file")], this.auth.private, this.create);
        this.onGet("/api/rms/rms-items/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-items/edit/:id", [], this.auth.private, this.edit);
        this.onPut("/api/rms/rms-items/update/:id", [upload.single("file")], this.auth.private, this.update);
    }

    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        return resp.view("rms/rms-items/index");
    }

    // ✅ CREATE RMS ITEM
    public async create(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const {
                itemType,
                manufactureOrigin,
                itemName,
                itemPrice,
                itemConfigurations,
                itemModel,
            } = req.body;

            if (!itemName) {
                return resp.status(400).json({
                    status: false,
                    message: "Item name is required",
                    data: null,
                });
            }

            // 🔥 GET FILE FROM MULTER
            const file = (req as any).file;

            // 🔥 SAVE FILE PATH (IMPORTANT)
            let filePath: string | null = null;

            if (file) {
                filePath = `uploads/${file.filename}`; // store relative path
            }

            const createdBy = req.user?.userId || 'system';

            const result = await this.rmsItemsService.create({
                itemType,
                manufactureOrigin,
                itemName,
                itemPrice,
                itemConfigurations,
                itemModel,
                files: filePath, // ✅ now correct
                createdBy,
            });

            return resp.status(201).json({
                status: true,
                message: "RMS item created successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Create RMS Item Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to create RMS item",
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

            const result = await this.rmsItemsService.getAll(
                searchStr,
                pageNum,
                limitNum
            );

            return resp.json({
                status: true,
                message: "RMS items fetched successfully",
                ...result,
            });

        } catch (error: any) {
            console.error("GetAll RMS Items Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch RMS items",
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

            const result = await this.rmsItemsService.edit(id);

            return resp.json({
                status: true,
                message: "RMS item fetched successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Edit RMS Item Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch item",
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
            message: "Invalid item id",
          });
        }

        // 🔥 Get existing item first
        const existing = await this.rmsItemsService.edit(id);

        if (!existing) {
          return resp.status(404).json({
            status: false,
            message: "Item not found",
          });
        }

        // 🔥 Get body values
        const {
          itemType,
          manufactureOrigin,
          itemName,
          itemPrice,
          itemConfigurations,
          itemModel,
        } = req.body;

        // 🔥 Get uploaded file
        const file = (req as any).file;

        let filePath = existing.files;

        // ✅ If new file uploaded → delete old file
        if (file) {
          // delete old file if exists
          if (existing.files) {
            const oldPath = path.join(process.cwd(), existing.files);

            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath); // 🗑 delete old file
            }
          }

          // save new file path
          filePath = `uploads/${file.filename}`;
        }

        const updatedBy = req.user?.userId || "system";

        // ✅ Prevent null overwrite
        const result = await this.rmsItemsService.update(id, {
          itemType: itemType ?? existing.itemType,
          manufactureOrigin: manufactureOrigin ?? existing.manufactureOrigin,
          itemName: itemName ?? existing.itemName,
          itemPrice: itemPrice ?? existing.itemPrice,
          itemConfigurations: itemConfigurations ?? existing.itemConfigurations,
          itemModel: itemModel ?? existing.itemModel,
          files: filePath,
          updatedBy,
        });

        return resp.json({
          status: true,
          message: "RMS item updated successfully",
          data: result,
        });

      } catch (error: any) {
        console.error("Update RMS Item Error:", error);
        return resp.status(500).json({
          status: false,
          message: "Failed to update item",
          data: error.message,
        });
      }
    }
}