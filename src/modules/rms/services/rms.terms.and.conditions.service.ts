import { Config } from "../../../core/Config";
import fs from "fs";
import { IRmsTermsAndConditionsRepository } from "../interfaces/rms.terms.and.conditions.interface";

const APP_CONFIG: Config = new Config(JSON.parse(fs.readFileSync("config.json").toString()));

export class RmsTermsAndConditionsService {
    private rmsTermsAndConditionsRepository: IRmsTermsAndConditionsRepository;

    constructor(rmsTermsAndConditionsRepository: IRmsTermsAndConditionsRepository) {
        this.rmsTermsAndConditionsRepository = rmsTermsAndConditionsRepository;
    }

    public async create(rmsTermsAndConditionsData: any): Promise<any> {
        try {
            const result = await this.rmsTermsAndConditionsRepository.create(rmsTermsAndConditionsData);
            return result;
        } catch (error) {
            console.error("Error in create in RMS Terms and Conditions Service:", error);
            throw new Error("Failed to create Rms Terms and Conditions record");
        }
    }

    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<any> {
        try {
            return await this.rmsTermsAndConditionsRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching Rms Terms and Conditions data:", error);
            throw new Error("Error fetching Rms Terms and Conditions data");
        }
    }

    public async edit(id: number): Promise<any> {
        try {
            const rmsTermsAndConditionsRecord = await this.rmsTermsAndConditionsRepository.edit(id);

            if (!rmsTermsAndConditionsRecord) {
                throw new Error(`No RMS Terms and Conditions record found for id: ${id}`);
            }

            return rmsTermsAndConditionsRecord;
        } catch (error) {
            console.error("Error fetching rms terms and conditions data in service layer:", error);
            throw new Error("Error fetching rms terms and conditions data");
        }
    }

    public async update(id: number, updateData: any): Promise<any> {
        try {
            const updatedRecord = await this.rmsTermsAndConditionsRepository.update(id, updateData);

            if (!updatedRecord) {
                throw new Error(`Failed to update rms terms and conditions record with ID: ${id}`);
            }

            return updatedRecord;
        } catch (error) {
            console.error("Error updating rms terms and conditions data in service layer:", error);
            throw new Error("Error updating rms terms and conditions data");
        }
    }

}
