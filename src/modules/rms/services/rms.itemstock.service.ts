import { Config } from "../../../core/Config";
import fs from "fs";
import {
    IRmsItemStock,
    IRmsItemStockRepository,
    IRmsItemStockService,
    IRmsItemStockPurchaseLine
} from "../interfaces/rms.itemstock.interface";

const APP_CONFIG: Config = new Config(
    JSON.parse(fs.readFileSync("config.json").toString())
);

export class RmsItemStockService implements IRmsItemStockService {
    private rmsItemStockRepository: IRmsItemStockRepository;

    constructor(rmsItemStockRepository: IRmsItemStockRepository) {
        this.rmsItemStockRepository = rmsItemStockRepository;
    }

    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsItemStock[];
        total: number;
        totalPages: number;
        currentPage: number;
    }> {
        try {
            return await this.rmsItemStockRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching stock list:", error);
            throw new Error("Failed to fetch stock data");
        }
    }

    public async edit(id: number): Promise<IRmsItemStock | null> {
        try {
            const record = await this.rmsItemStockRepository.edit(id);
            if (!record) {
                return null;
            }
            return record;
        } catch (error) {
            console.error("Error fetching stock:", error);
            throw new Error("Failed to fetch stock");
        }
    }

    public async getByItemId(itemId: number): Promise<IRmsItemStock | null> {
        try {
            return await this.rmsItemStockRepository.getByItemId(itemId);
        } catch (error) {
            console.error("Error fetching stock by itemId:", error);
            throw new Error("Failed to fetch stock");
        }
    }

    public async updateByItemId(
        itemId: number,
        updateData: Partial<IRmsItemStock>
    ): Promise<any> {
        try {
            return await this.rmsItemStockRepository.updateByItemId(itemId, updateData);
        } catch (error) {
            console.error("Error updating stock:", error);
            throw new Error("Failed to update stock");
        }
    }

    public async createOrUpdateStock(
        itemId: number,
        quantityDelta: number,
        unitPrice?: string,
        createdBy?: string | null
    ): Promise<any> {
        try {
            const existingStock = await this.rmsItemStockRepository.getByItemId(itemId);

            if (existingStock) {
                const currentOnHand = existingStock.onHandQuantity ?? 0;
                const reserved = existingStock.reservedQuantity ?? 0;

                const newOnHand = currentOnHand + quantityDelta;

                // 🚨 DO NOT ALLOW NEGATIVE
                if (newOnHand < 0) {
                    throw new Error(`Stock cannot go negative for itemId ${itemId}`);
                }

                const newAvailable = newOnHand - reserved;

                return await this.rmsItemStockRepository.updateByItemId(itemId, {
                    onHandQuantity: newOnHand,
                    reservedQuantity: reserved, // ✅ FIX (VERY IMPORTANT)
                    availableQuantity: newAvailable,
                    lastPurchasePrice: unitPrice ?? existingStock.lastPurchasePrice ?? null,
                    lastPurchaseDate: quantityDelta > 0 ? new Date() : existingStock.lastPurchaseDate ?? null,
                    updatedBy: createdBy ?? null
                });

            } else {
                // NEW STOCK
                if (quantityDelta < 0) {
                    throw new Error(`Cannot create negative stock for itemId ${itemId}`);
                }

                const onHand = quantityDelta;
                const reserved = 0;
                const available = onHand - reserved;

                return await this.rmsItemStockRepository.create({
                    itemId,
                    onHandQuantity: onHand,
                    reservedQuantity: reserved, // ✅ FIX
                    availableQuantity: available,
                    lastPurchasePrice: unitPrice ?? null,
                    lastPurchaseDate: quantityDelta > 0 ? new Date() : null,
                    createdBy: createdBy ?? null
                });
            }

        } catch (error) {
            console.error("Error in createOrUpdateStock:", error);
            throw error;
        }
    }

    public async syncPurchaseStock(
        previousItems: IRmsItemStockPurchaseLine[],
        currentItems: IRmsItemStockPurchaseLine[],
        userId?: string | null
    ): Promise<void> {
        try {
            if (previousItems && previousItems.length > 0) {
                for (const item of previousItems) {
                    await this.createOrUpdateStock(item.itemId, -item.quantity, undefined, userId);
                }
            }

            if (currentItems && currentItems.length > 0) {
                for (const item of currentItems) {
                    await this.createOrUpdateStock(item.itemId, item.quantity, item.unitPrice, userId);
                }
            }
        } catch (error) {
            console.error("Error syncing purchase stock:", error);
            throw error;
        }
    }
}
