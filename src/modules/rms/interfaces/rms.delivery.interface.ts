export interface IRmsDeliveryItem {
    id?: number;
    deliveryId?: number;
    itemId: number;
    deliveredQuantity?: number;
    notes?: string;
    createdBy?: number;
    createdAt?: Date;
}

export interface IRmsDelivery {
    id?: number;
    deliveryNumber: string;
    quotationId?: number;
    companyName: string;
    companyEmail?: string;
    notes?: string;
    deliveryStatus?: string;
    createdBy?: number;
    updatedBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
    items?: IRmsDeliveryItem[];
}

export interface IRmsDeliveryRepository {
    createDelivery(data: Partial<IRmsDelivery>): Promise<IRmsDelivery>;
    getAll(searchStr: string, page: number, limit: number): Promise<{
        data: IRmsDelivery[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    edit(id: number): Promise<IRmsDelivery | null>;
    update(id: number, data: Partial<IRmsDelivery>, items: IRmsDeliveryItem[]): Promise<any>;
    getDataByQuotationId(quotationId: number): Promise<any>;
    delete(id: number): Promise<boolean>;
}

export interface IRmsDeliveryService {
    create(data: Partial<IRmsDelivery>): Promise<IRmsDelivery>;
    getAll(searchStr: string, page: number, limit: number): Promise<{
        data: IRmsDelivery[];
        total: number;
        totalPages: number;
        currentPage: number;
    }>;
    edit(id: number): Promise<IRmsDelivery | null>;
    update(id: number, data: Partial<IRmsDelivery>, items: IRmsDeliveryItem[]): Promise<any>;
    getItemDropdown(): Promise<{ id: string; label: string }[]>;
    generateDeliveryNumber(companyName: string): Promise<string>;
    generatePdf(id: number): Promise<{ pdfBuffer: Buffer; emailSent?: boolean }>;
    createFromQuotation(quotationId: number, userId?: number): Promise<IRmsDelivery>;
    delete(id: number): Promise<boolean>;
}