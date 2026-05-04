import { RmsPurchaseItemModel } from "../models/rms.purchase.item.model";
import { RmsPurchaseModel } from "../models/rms.purchase.model";

export interface IRmsPurchaseItem {
    id?: number;
    purchaseId?: number;
    itemId: number;
    quantity: number;
    unitPrice?: string | null;
    totalPrice?: string | null;
    notes?: string | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IRmsPurchase {
    id?: number;
    purchaseNumber: string;
    supplierName?: string | null;
    supplierEmail?: string | null;
    purchaseStatus?: string | null;
    notes?: string | null;
    files?: string | null;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    items?: IRmsPurchaseItem[];
}

export interface IRmsPurchaseItemRepository {
    create(rmsPurchaseItemsData: IRmsPurchaseItem): Promise<RmsPurchaseItemModel>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{ data: IRmsPurchaseItem[]; total: number }>;

    edit(id: number): Promise<IRmsPurchaseItem | null>;
    update(id: number, updateData: Partial<IRmsPurchaseItem>): Promise<any>;
}

export interface IRmsPurchaseRepository {
    create(rmsPurchaseData: IRmsPurchase): Promise<RmsPurchaseModel>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{ data: IRmsPurchase[]; total: number }>;

    edit(id: number): Promise<IRmsPurchase | null>;
    update(id: number, updateData: Partial<IRmsPurchase>): Promise<any>;

    getDataByItemId(): Promise<{ id: string; label: string }[]>;
}