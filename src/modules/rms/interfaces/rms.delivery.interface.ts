export interface IRmsDeliveryItem {
    id?: number;
    deliveryId?: number;
    itemId: number;
    deliveredQuantity: number; // ✅ REQUIRED (important)
    notes?: string;
    createdBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IRmsDelivery {
    id?: number;
    deliveryNumber: string;
    // 🔥 Mode control
    deliveryMode?: "direct" | "quotation";
    quotationId?: number; // required only if quotation mode
    companyName: string;
    companyEmail?: string;
    notes?: string;
    deliveryStatus: "pending" | "delivered" | "cancelled";
    createdBy?: number;
    updatedBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
    items: IRmsDeliveryItem[]; // ✅ REQUIRED
}

export interface IRmsDeliveryRepository {

    create(data: Partial<IRmsDelivery>): Promise<IRmsDelivery>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsDelivery[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;

    edit(id: number): Promise<IRmsDelivery | null>;

    update(
        id: number,
        data: Partial<IRmsDelivery>,
        items: IRmsDeliveryItem[]
    ): Promise<any>;

    delete(id: number): Promise<boolean>;

    // 🔥 From quotation
    getDataByQuotationId(quotationId: number): Promise<any>;
}