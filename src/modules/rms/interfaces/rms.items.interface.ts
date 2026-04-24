import { RmsItemsModel } from "../models/rms.items.model";

export interface IRmsItems {
    id: number;
    itemType: string;
    manufactureOrigin: string;
    itemName: string;
    itemPrice: string;
    itemConfigurations?: string;
    itemModel?: string;
    files?: string;
    createdBy?: string;
    updatedBy?: string;
    created_at: Date;
    updated_at: Date;
}

export interface IRmsItemsRepository {
    create(rmsItemsData: IRmsItems): Promise<RmsItemsModel>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{ data: IRmsItems[]; total: number }>;

    edit(id: number): Promise<IRmsItems | null>;
    update(id: number, updateData: Partial<IRmsItems>): Promise<any>;
}
