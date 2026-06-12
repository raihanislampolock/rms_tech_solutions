import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsItemStockService } from "../services/rms.itemstock.service";
import { IRmsItemStock } from "../interfaces/rms.itemstock.interface";
import ExcelJS from "exceljs";

export class RmsItemStockController extends Controller {

    private rmsItemStockService: RmsItemStockService;
    private auth = { private: true, public: false };

    constructor() {
        super();
        this.rmsItemStockService = this.getService("RmsItemStockService");
    }

    public onRegister(): void {
        this.onGet("/rms/rms-stock", [], this.auth.private, this.index);
        this.onGet("/api/rms/rms-stock/all", [], this.auth.private, this.getAll);
        this.onGet("/api/rms/rms-stock/edit/:id", [], this.auth.private, this.edit);
        this.onGet("/api/rms/rms-stock/by-item/:itemId", [], this.auth.private, this.getByItemId);
        this.onGet("/api/rms/rms-stock/export/excel", [], this.auth.private, this.exportExcel);
    }

    public async index(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        return resp.view("rms/rms-stock/index");
    }

    public async getAll(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const { search, page = 1, limit = 10 } = req.query;

            const searchStr = typeof search === "string" ? search.trim() : "";
            const pageNum = Math.max(Number(page), 1);
            const limitNum = Math.min(Math.max(Number(limit), 1), 100);

            const result = await this.rmsItemStockService.getAll(
                searchStr,
                pageNum,
                limitNum
            );

            return resp.json({
                status: true,
                message: "Stock fetched successfully",
                ...result,
            });

        } catch (error: any) {
            console.error("GetAll Stock Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch stock data",
                data: error.message,
            });
        }
    }

    public async edit(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const id = Number(req.params.id);

            if (!id) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid stock id",
                });
            }

            const result = await this.rmsItemStockService.edit(id);

            return resp.json({
                status: true,
                message: "Stock fetched successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Edit Stock Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch stock",
                data: error.message,
            });
        }
    }

    public async getByItemId(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const itemId = Number(req.params.itemId);

            if (!itemId) {
                return resp.status(400).json({
                    status: false,
                    message: "Invalid item id",
                });
            }

            const result = await this.rmsItemStockService.getByItemId(itemId);

            if (!result) {
                return resp.status(404).json({
                    status: false,
                    message: "Stock not found for this item",
                    data: null,
                });
            }

            return resp.json({
                status: true,
                message: "Stock fetched successfully",
                data: result,
            });

        } catch (error: any) {
            console.error("Get Stock by ItemId Error:", error);
            return resp.status(500).json({
                status: false,
                message: "Failed to fetch stock",
                data: error.message,
            });
        }
    }

    public async exportExcel(req: HttpRequest, resp: HttpResponse, next: NextFunc) {
        try {
            const { search, dateRange } = req.query;

            const searchStr = typeof search === "string" ? search.trim() : undefined;


            // ✅ Fetch ALL filtered data (no pagination)
            const { data }: { data: any[] } =
                await this.rmsItemStockService.getAll(
                    searchStr || "",
                    1,
                    1000000 // large limit for export
                );

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("RMS Stock");

            // ✅ Excel columns
            worksheet.columns = [
                { header: "Item Name", key: "itemName", width: 18 },
                { header: "Item Type", key: "itemType", width: 18 },
                { header: "On Hand Quantity", key: "onHandQuantity", width: 25 },
                { header: "Reserved Quantity", key: "reservedQuantity", width: 25 },
                { header: "Available Quantity", key: "availableQuantity", width: 25 },
                { header: "Last Purchase Price", key: "lastPurchasePrice", width: 20 },
                { header: "Last Purchase Date", key: "lastPurchaseDate", width: 20 },
                { header: "Notes", key: "notes", width: 15 }
            ];

            // ✅ Add rows
            data.forEach(row => {
                worksheet.addRow({
                    itemName: row.itemName ?? "",
                    itemType: row.itemType ?? "",
                    onHandQuantity: row.onHandQuantity ?? 0,
                    reservedQuantity: row.reservedQuantity ?? 0,
                    availableQuantity: row.availableQuantity ?? 0,
                    lastPurchasePrice: row.lastPurchasePrice ?? 0,
                    lastPurchaseDate: row.lastPurchaseDate ?? "",
                    notes: row.notes ?? ""
                });
            });

            // ✅ Header styling
            worksheet.getRow(1).eachCell(cell => {
                cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "580db4" } // RMS Colour
                };
                cell.alignment = { horizontal: "center" };
            });

            worksheet.eachRow(row => {
                row.height = 22;
            });

            // ✅ Response headers
            resp.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            resp.setHeader(
                "Content-Disposition",
                `attachment; filename=rms_stock_${Date.now()}.xlsx`
            );

            await workbook.xlsx.write(resp);
            resp.end();

        } catch (error: any) {
            console.error("Error exporting RMS Stock Excel:", error);
            return resp.status(500).json({
                status: false,
                message: "An error occurred while exporting RMS Stock Excel",
                error: error.message,
            });
        }
    }
}
