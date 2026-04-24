import { AppDataSource } from "../../../init";
import { IRmsItems, IRmsItemsRepository } from "../interfaces/rms.items.interface";
import { RmsItemsModel } from "../models/rms.items.model";

export class RmsItemsRepository implements IRmsItemsRepository {
    private rmsItemsModel = AppDataSource.getRepository(RmsItemsModel);

    public async create(rmsItemsData: Partial<RmsItemsModel>): Promise<RmsItemsModel> {
        try {
            const newRmsItems = this.rmsItemsModel.create({
                itemType: rmsItemsData.itemType,
                manufactureOrigin: rmsItemsData.manufactureOrigin,
                itemName: rmsItemsData.itemName,
                itemPrice: rmsItemsData.itemPrice,
                itemConfigurations: rmsItemsData.itemConfigurations,
                itemModel: rmsItemsData.itemModel,
                files: rmsItemsData.files,
                createdBy: rmsItemsData.createdBy,
                createdAt: new Date(),
            });

            return await this.rmsItemsModel.save(newRmsItems);
        } catch (error) {
            console.error("Error in RMS Items:", error);
            throw new Error("Failed to RMS Items.");
        }
    }

    public async getAll(
        searchStr: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: any[]; total: number; totalPages: number; currentPage: number }> {
        try {
            const offset = (page - 1) * limit;
            const whereClauses: string[] = [];
            const params: any[] = [];

            if (searchStr) {
                whereClauses.push(`
                    (
                        i."itemType" ILIKE $${params.length + 1} OR
                        i."manufactureOrigin" ILIKE $${params.length + 1} OR
                        i."itemName" ILIKE $${params.length + 1} OR
                        i."itemConfigurations" ILIKE $${params.length + 1} OR
                        i."itemModel" ILIKE $${params.length + 1} OR
                        i."itemPrice" ILIKE $${params.length + 1}
                    )
                `);
                params.push(`%${searchStr}%`);
            }


            if (whereClauses.length === 0) {
                whereClauses.push("1 = 1");
            }

            const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

            const query = `
                select
                i.id,
                i."itemType",
                i."manufactureOrigin",
                i."itemName",
                i."itemPrice",
                i."itemConfigurations",
                i."itemModel",
                i.files,
                u."empId" as "createdBy",
                u2."empId" as "updatedBy",
                i.created_at,
                i.updated_at
                from public.rms_items i
                left join public.users u on i."createdBy" = u."userId"
                left join public.users u2 on i."updatedBy" = u2."userId"
                ${whereSQL}
                ORDER BY i."created_at" DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `;

            const countQuery = `
               SELECT COUNT(i.id) AS total
               FROM public.rms_items i
               ${whereSQL}
            `;

            const data = await AppDataSource.query(query, [...params, limit, offset]);
            const countResult = await AppDataSource.query(countQuery, params);

            const total = parseInt(countResult[0]?.total || "0", 10);
            const totalPages = Math.ceil(total / limit);

            return {
                data,
                total,
                totalPages,
                currentPage: page,
            };
        } catch (error) {
            console.error("Error fetching filtered role data:", error);
            throw new Error("Failed to fetch filtered role data.");
        }
    }

    public async edit(id: number): Promise<any> {
        try {
            const query = `
                select
                i."itemType",
                i."manufactureOrigin",
                i."itemName",
                i."itemPrice",
                i."itemConfigurations",
                i."itemModel",
                i.files,
                u."empId" as "createdBy",
                u2."empId" as "updatedBy",
                i.created_at,
                i.updated_at
                from public.rms_items i
                left join public.users u on i."createdBy" = u."userId"
                left join public.users u2 on i."updatedBy" = u2."userId"
            WHERE
                i."id" = $1
            LIMIT 1`;

            const result = await AppDataSource.query(query, [id]);
            return result[0];
        } catch (error) {
            console.error("Error fetching Rms Items record for edit:", error);
            throw new Error("Failed to fetch Rms Items record");
        }
    }

    public async update(id: number, data: IRmsItems): Promise<any> {
        try {
            const query = `
                UPDATE public.rms_items
                SET
                    "itemType" = $2,
                    "manufactureOrigin" = $3,
                    "itemName" = $4,
                    "itemPrice" = $5,
                    "itemConfigurations" = $6,
                    "itemModel" = $7,
                    "files" = $8,
                    "updatedBy" = $9,
                    updated_at = NOW()
                WHERE
                    "id" = $1
            `;

            const params = [
                id,
                data.itemType,
                data.manufactureOrigin,
                data.itemName,
                data.itemPrice,
                data.itemConfigurations,
                data.itemModel,
                data.files,
                data.updatedBy
            ];

            await AppDataSource.query(query, params);
            return { status: true, message: 'RMS Items record updated successfully' };

        } catch (error) {
            console.error("Error updating itms data in repository layer:", error);
            throw new Error("Failed to update rms items record");
        }
    }
}
