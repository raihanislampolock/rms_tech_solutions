import { AppDataSource } from "../../../init";
import { IRmsItemStock, IRmsItemStockRepository, IRmsItemStockPurchaseLine } from "../interfaces/rms.itemstock.interface";
import { RmsItemStockModel } from "../models/rms.itemstock.model";

export class RmsItemStockRepository implements IRmsItemStockRepository {
    private itemStockModel = AppDataSource.getRepository(RmsItemStockModel);

    public async getAll(
        searchStr: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: any[]; total: number; totalPages: number; currentPage: number }> {
        try {
            const offset = (page - 1) * limit;
            const whereClauses: string[] = [];
            const params: any[] = [];

            if (searchStr) {
                whereClauses.push(`
                    (
                        i."itemName" ILIKE $${params.length + 1} OR
                        i."itemType" ILIKE $${params.length + 1}
                    )
                `);
                params.push(`%${searchStr}%`);
            }

            if (whereClauses.length === 0) {
                whereClauses.push("1 = 1");
            }

            const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

            const query = `
                SELECT
                    s.id,
                    s."itemId",
                    i."itemName",
                    i."itemType",
                    s."onHandQuantity",
                    s."reservedQuantity",
                    s."availableQuantity",
                    s."lastPurchasePrice",
                    s."lastPurchaseDate",
                    s.notes,
                    s.created_at,
                    s.updated_at
                FROM public.rms_item_stocks s
                LEFT JOIN public.rms_items i ON s."itemId" = i.id
                ${whereSQL}
                ORDER BY s."created_at" DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `;

            const countQuery = `
                SELECT COUNT(s.id) AS total
                FROM public.rms_item_stocks s
                LEFT JOIN public.rms_items i ON s."itemId" = i.id
                ${whereSQL}
            `;

            const data = await AppDataSource.query(query, [...params, limit, offset]);
            const countResult = await AppDataSource.query(countQuery, params);

            const total = parseInt(countResult[0]?.total || "0", 10);
            const totalPages = Math.ceil(total / limit);

            return {
                data,
                total,
                totalPages,
                currentPage: page,
            };
        } catch (error) {
            console.error("Error fetching stock data:", error);
            throw new Error("Failed to fetch stock data");
        }
    }

    public async edit(id: number): Promise<IRmsItemStock | null> {
        try {
            const stock = await this.itemStockModel.findOne({
                where: { id },
                relations: ["item"],
            });
            return stock || null;
        } catch (error) {
            console.error("Error fetching stock for edit:", error);
            throw new Error("Failed to fetch stock");
        }
    }

    public async update(id: number, updateData: Partial<IRmsItemStock>): Promise<any> {
        try {
            const result = await this.itemStockModel.update(id, updateData);
            return result;
        } catch (error) {
            console.error("Error updating stock by id:", error);
            throw new Error("Failed to update stock");
        }
    }

    public async getByItemId(itemId: number): Promise<IRmsItemStock | null> {
        try {
            const stock = await this.itemStockModel.findOne({
                where: { itemId },
                relations: ["item"],
            });
            return stock || null;
        } catch (error) {
            console.error("Error fetching stock by itemId:", error);
            throw new Error("Failed to fetch stock");
        }
    }

    public async create(data: Partial<IRmsItemStock>): Promise<RmsItemStockModel> {
        try {
            const stock = this.itemStockModel.create({
                itemId: data.itemId,
                onHandQuantity: data.onHandQuantity || 0,
                reservedQuantity: data.reservedQuantity || 0,
                availableQuantity: data.availableQuantity || 0,
                lastPurchasePrice: data.lastPurchasePrice,
                lastPurchaseDate: data.lastPurchaseDate,
                notes: data.notes,
                createdBy: data.createdBy,
            });
            return await this.itemStockModel.save(stock);
        } catch (error) {
            console.error("Error creating stock:", error);
            throw new Error("Failed to create stock");
        }
    }

    public async updateByItemId(itemId: number, updateData: Partial<IRmsItemStock>): Promise<any> {
        try {
            const query = `
                UPDATE public.rms_item_stocks
                SET
                    "onHandQuantity" = $2,
                    "reservedQuantity" = $3,
                    "availableQuantity" = $4,
                    "lastPurchasePrice" = $5,
                    "lastPurchaseDate" = $6,
                    "notes" = $7,
                    "updatedBy" = $8,
                    updated_at = NOW()
                WHERE
                    "itemId" = $1
            `;

            const params = [
                itemId,
                updateData.onHandQuantity,
                updateData.reservedQuantity,
                updateData.availableQuantity,
                updateData.lastPurchasePrice,
                updateData.lastPurchaseDate,
                updateData.notes,
                updateData.updatedBy
            ];

            await AppDataSource.query(query, params);
            return { status: true, message: 'Stock updated successfully' };
        } catch (error) {
            console.error("Error updating stock:", error);
            throw new Error("Failed to update stock");
        }
    }
}
