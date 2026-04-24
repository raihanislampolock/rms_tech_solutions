import { Config } from "../../../core/Config";
import fs from "fs";
import { IRmsItemsRepository } from "../interfaces/rms.items.interface";
import { RmsItemsModel } from "../models/rms.items.model";

const APP_CONFIG: Config = new Config(JSON.parse(fs.readFileSync("config.json").toString()));

export class RmsItemsService {
    private rmsItemsRepository: IRmsItemsRepository;

    constructor(rmsItemsRepository: IRmsItemsRepository) {
        this.rmsItemsRepository = rmsItemsRepository;
    }

    public async create(rmsItemsData: any): Promise<any> {
        try {
            const result = await this.rmsItemsRepository.create(rmsItemsData);
            return result;
        } catch (error) {
            console.error("Error in create in Rms Items Service:", error);
            throw new Error("Failed to create Rms Items record");
        }
    }

    public async getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<any> {
        try {
            return await this.rmsItemsRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching Rms Items data:", error);
            throw new Error("Error fetching Rms Items data");
        }
    }

    public async edit(id: number): Promise<any> {
        try {
            const rmsItemsRecord = await this.rmsItemsRepository.edit(id);

            if (!rmsItemsRecord) {
                throw new Error(`No role record found for roleId: ${id}`);
            }

            return rmsItemsRecord;
        } catch (error) {
            console.error("Error fetching rms items data in service layer:", error);
            throw new Error("Error fetching rms items data");
        }
    }

    public async update(id: number, updateData: any): Promise<any> {
        try {
            const updatedRecord = await this.rmsItemsRepository.update(id, updateData);

            if (!updatedRecord) {
                throw new Error(`Failed to update rms items record with ID: ${id}`);
            }

            return updatedRecord;
        } catch (error) {
            console.error("Error updating rms items data in service layer:", error);
            throw new Error("Error updating rms items data");
        }
    }

}
