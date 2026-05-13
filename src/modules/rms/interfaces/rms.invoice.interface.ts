export interface IRmsInvoiceItem {
    id?: number;
    invoiceId?: number;
    itemId: number;
    itemName?: string;
    itemType?: string;
    itemModel?: string;
    itemConfigurations?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    itemDiscountAmount?: number;
    notes?: string;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IRmsInvoice {
    id?: number;
    invoiceNumber: string;
    quotationId?: number;
    challanId?: number;
    companyName: string;
    companyEmail?: string;
    notes?: string;
    invoiceStatus: "pending" | "paid" | "cancelled";
    totalAmount?: number;
    taxAmount?: number;
    discountAmount?: number;
    grandTotal?: number;
    username?: string;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    items: IRmsInvoiceItem[];
}

export interface IRmsInvoiceRepository {

    create(data: Partial<IRmsInvoice>): Promise<IRmsInvoice>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{
        data: IRmsInvoice[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;

    edit(id: number): Promise<IRmsInvoice | null>;

    update(
        id: number,
        data: Partial<IRmsInvoice>,
        items: IRmsInvoiceItem[]
    ): Promise<any>;

    getDataByQuotationId(refNumber: string): Promise<any>;

    getDataByChallanNumber(challanNumber: string): Promise<any>;
}