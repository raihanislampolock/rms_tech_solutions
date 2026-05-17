import { AppDataSource } from "../../../init";
import { IRmsTermsAndConditions, IRmsTermsAndConditionsRepository } from "../interfaces/rms.terms.and.conditions.interface";
import { RmsTermsAndConditionsModel } from "../models/rms.terms.and.conditions.modal";

export class RmsTermsAndConditionsRepository implements IRmsTermsAndConditionsRepository {
    private rmsTermsAndConditionsModel = AppDataSource.getRepository(RmsTermsAndConditionsModel);

    public async create(rmsTermsAndConditionsData: Partial<RmsTermsAndConditionsModel>): Promise<RmsTermsAndConditionsModel> {
        try {
            const newRmsTermsAndConditions = this.rmsTermsAndConditionsModel.create({
                timeLine: rmsTermsAndConditionsData.timeLine,
                payment: rmsTermsAndConditionsData.payment,
                warranty: rmsTermsAndConditionsData.warranty,
                remarks: rmsTermsAndConditionsData.remarks,
                createdBy: rmsTermsAndConditionsData.createdBy,
                createdAt: new Date(),
            });

            return await this.rmsTermsAndConditionsModel.save(newRmsTermsAndConditions);
        } catch (error) {
            console.error("Error in RMS Terms and Conditions:", error);
            throw new Error("Failed to create RMS Terms and Conditions.");
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
                        t."timeLine" ILIKE $${params.length + 1} OR
                        t."payment" ILIKE $${params.length + 1} OR
                        t."warranty" ILIKE $${params.length + 1} OR
                        t."remarks" ILIKE $${params.length + 1}
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
                t.id,
                t."timeLine",
                t."payment",
                t."warranty",
                t."remarks",
                t."created_at",
                t.updated_at,
                u."empId" as "createdBy",
                u2."empId" as "updatedBy"
                from public.rms_terms_and_conditions t
                left join public.users u on t."createdBy" = u."userId"
                left join public.users u2 on t."updatedBy" = u2."userId"
                ${whereSQL}
                ORDER BY t."created_at" DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `;

            const countQuery = `
               SELECT COUNT(t.id) AS total
               FROM public.rms_terms_and_conditions t
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
            console.error("Error fetching filtered terms and conditions data:", error);
            throw new Error("Failed to fetch filtered terms and conditions data.");
        }
    }

    public async edit(id: number): Promise<any> {
        try {
            const query = `
                select
                t.id,
                t."timeLine",
                t."payment",
                t."warranty",
                t."remarks",
                t."created_at",
                t.updated_at,
                u."empId" as "createdBy",
                u2."empId" as "updatedBy"
                from public.rms_terms_and_conditions t
                left join public.users u on t."createdBy" = u."userId"
                left join public.users u2 on t."updatedBy" = u2."userId"
            WHERE
                t."id" = $1
            LIMIT 1`;

            const result = await AppDataSource.query(query, [id]);
            return result[0];
        } catch (error) {
            console.error("Error fetching Rms Terms and Conditions record for edit:", error);
            throw new Error("Failed to fetch Rms Terms and Conditions record");
        }
    }

    public async update(id: number, data: IRmsTermsAndConditions): Promise<any> {
        try {
            const query = `
                UPDATE public.rms_terms_and_conditions
                SET
                    "timeLine" = $2,
                    "payment" = $3,
                    "warranty" = $4,
                    "remarks" = $5,
                    "updatedBy" = $6,
                    updated_at = NOW()
                WHERE
                    "id" = $1
            `;

            const params = [
                id,
                data.timeLine,
                data.payment,
                data.warranty,
                data.remarks,
                data.updatedBy
            ];

            await AppDataSource.query(query, params);
            return { status: true, message: 'RMS Terms and Conditions record updated successfully' };

        } catch (error) {
            console.error("Error updating Rms Terms and Conditions data in repository layer:", error);
            throw new Error("Failed to update Rms Terms and Conditions record");
        }
    }
}
