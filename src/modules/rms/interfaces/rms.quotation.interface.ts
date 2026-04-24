export interface IRmsQuotationItem {
    id?: number;
    quotationId?: number;
    itemId: number;
    rmsPrice: string;
    quarterly?: string | null;
    createdBy?: string;
    createdAt?: Date;
}

export interface IRmsQuotation {
    id: number;
    refNumber: string;
    companyName: string;
    companyEmail?: string | null;
    subject: string;
    discriptions: string;
    createdBy?: string | null;
    updatedBy?: string | null;
    createdAt: Date;
    updatedAt: Date;

    // ✅ relation
    items?: IRmsQuotationItem[];
}

export interface IRmsQuotationRepository {

    createQuotation(data: Partial<IRmsQuotation>): Promise<IRmsQuotation>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{ data: IRmsQuotation[]; total: number; totalPages: number; currentPage: number }>;

    edit(id: number): Promise<IRmsQuotation | null>;

    update(
        id: number,
        data: Partial<IRmsQuotation>,
        items: IRmsQuotationItem[]
    ): Promise<any>;

    getDataByItemId(): Promise<{ id: string; label: string }[]>;
}