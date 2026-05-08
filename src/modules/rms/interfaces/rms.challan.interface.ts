export interface IRmsChallanItem {
    id?: number;
    challanId?: number;
    itemId: number;
    deliveredQuantity: number; // ✅ REQUIRED (important)
    notes?: string;
    createdBy?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface IRmsChallan {
    id?: number;
    challanNumber: string;
    // 🔥 Mode control
    challanMode?: "direct" | "quotation";
    quotationId?: number; // required only if quotation mode
    companyName: string;
    companyEmail?: string;
    notes?: string;
    challanStatus?: "pending" | "delivered" | "cancelled";
    createdBy?: string;
    updatedBy?: string;
    created_at?: Date;
    updated_at?: Date;
    items: IRmsChallanItem[]; // ✅ REQUIRED
}

export interface IRmsChallanRepository {

    create(data: Partial<IRmsChallan>): Promise<IRmsChallan>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsChallan[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;

    edit(id: number): Promise<IRmsChallan | null>;

    update(
        id: number,
        data: Partial<IRmsChallan>,
        items: IRmsChallanItem[]
    ): Promise<any>;

    delete(id: number): Promise<boolean>;

    // 🔥 From quotation
    getDataByQuotationId(refNumber: string): Promise<any>;
}