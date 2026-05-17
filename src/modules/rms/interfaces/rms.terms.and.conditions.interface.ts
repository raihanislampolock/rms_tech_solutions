import { RmsTermsAndConditionsModel } from "../models/rms.terms.and.conditions.modal";

export interface IRmsTermsAndConditions {
    id: number;
    timeLine: string;
    payment: string;
    warranty: string;
    remarks: string;
    createdBy?: string;
    updatedBy?: string;
    created_at: Date;
    updated_at: Date;
}

export interface IRmsTermsAndConditionsRepository {
    create(rmsTermsAndConditionsData: IRmsTermsAndConditions): Promise<RmsTermsAndConditionsModel>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{ data: IRmsTermsAndConditions[]; total: number }>;

    edit(id: number): Promise<IRmsTermsAndConditions | null>;
    update(id: number, updateData: Partial<IRmsTermsAndConditions>): Promise<any>;
}
