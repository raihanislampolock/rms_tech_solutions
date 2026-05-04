import { RmsItemStockModel } from "../models/rms.itemstock.model";

export interface IRmsItemStock {
    id?: number;
    itemId: number;
    onHandQuantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    lastPurchasePrice?: string | null;
    lastPurchaseDate?: Date | null;
    notes?: string | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    item?: {
        id: number;
        itemName?: string;
        itemPrice?: string;
    } | null;
}

export interface IRmsItemStockRepository {
    create(rmsItemsStockData: IRmsItemStock): Promise<RmsItemStockModel>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsItemStock[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;

    edit(id: number): Promise<IRmsItemStock | null>;
    update(id: number, updateData: Partial<IRmsItemStock>): Promise<any>;
    getByItemId(itemId: number): Promise<IRmsItemStock | null>;
    updateByItemId(itemId: number, updateData: Partial<IRmsItemStock>): Promise<any>;
}

export interface IRmsItemStockService {
    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsItemStock[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    edit(id: number): Promise<IRmsItemStock | null>;
    getByItemId(itemId: number): Promise<IRmsItemStock | null>;
    updateByItemId(itemId: number, updateData: Partial<IRmsItemStock>): Promise<any>;
    createOrUpdateStock(
        itemId: number,
        quantityDelta: number,
        unitPrice?: string,
        createdBy?: string | null
    ): Promise<any>;
    syncPurchaseStock(
        previousItems: IRmsItemStockPurchaseLine[],
        currentItems: IRmsItemStockPurchaseLine[],
        userId?: string | null
    ): Promise<void>;
}

export interface IRmsItemStockPurchaseLine {
    itemId: number;
    quantity: number;
    unitPrice?: string;
}
