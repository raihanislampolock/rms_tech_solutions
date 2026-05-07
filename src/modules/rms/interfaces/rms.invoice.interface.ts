export interface IRmsInvoiceItem {
    id?: number;
    invoiceId?: number;
    itemId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
    createdBy?: number;
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
    createdBy?: number;
    updatedBy?: number;
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

    delete(id: number): Promise<boolean>;

    getDataByQuotationId(quotationId: number): Promise<any>;

    getDataByChallanId(challanId: number): Promise<any>;
}