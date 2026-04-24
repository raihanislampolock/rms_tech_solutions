import { AppDataSource } from "../../../init";
import {
    IRmsQuotation,
    IRmsQuotationItem,
    IRmsQuotationRepository
} from "../interfaces/rms.quotation.interface";
import { RmsQuotationModel } from "../models/rms.quotation.model";
import { RmsQuotationItemModel } from "../models/rms.quotation.Item.model";

export class RmsQuotationRepository implements IRmsQuotationRepository {

    private quotationRepo = AppDataSource.getRepository(RmsQuotationModel);
    private itemRepo = AppDataSource.getRepository(RmsQuotationItemModel);

    // ✅ CREATE (Parent + Items)
    public async createQuotation(data: Partial<IRmsQuotation>): Promise<IRmsQuotation> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 👉 Save quotation
            const quotation = queryRunner.manager.create(RmsQuotationModel, {
                refNumber: data.refNumber,
                companyName: data.companyName,
                companyEmail: data.companyEmail ?? null,
                subject: data.subject,
                discriptions: data.discriptions,
                createdBy: data.createdBy ?? null,
            });

            const savedQuotation = await queryRunner.manager.save(quotation);

            // 👉 Save items
            if (data.items && data.items.length > 0) {
                const items = data.items.map(item => ({
                    quotationId: savedQuotation.id,
                    itemId: item.itemId,
                    rmsPrice: item.rmsPrice,
                    quarterly: item.quarterly ?? null,
                    createdBy: data.createdBy
                }));

                const itemEntities = queryRunner.manager.create(RmsQuotationItemModel, items);
                await queryRunner.manager.save(itemEntities);
            }

            await queryRunner.commitTransaction();

            return {
                ...savedQuotation,
                items: data.items || []
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Create failed:", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // ✅ GET ALL
    public async getAll(searchStr: string, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const params: any[] = [];
        let whereSQL = "";

        if (searchStr) {
            whereSQL = `
                WHERE q."refNumber" ILIKE $1
                OR q."companyName" ILIKE $1
                OR q.subject ILIKE $1
            `;
            params.push(`%${searchStr}%`);
        }

        const query = `
            select
                q.id,
                q."refNumber",
                q."companyName",
                q."companyEmail",
                q.subject,
                q.discriptions,
                i."itemName",
                i."itemPrice",
                qi."rmsPrice",
                (i."itemPrice"::numeric * qi."quarterly"::numeric) AS "totalItemPrice",
				(qi."rmsPrice"::numeric * qi."quarterly"::numeric) AS "totalRmsPrice",
                qi.quarterly,
                i."itemConfigurations",
                i."itemType",
                i."manufactureOrigin",
                i."itemModel",
                i.files,
                u."empId" as "createdBy",
                u2."empId" as "updatedBy",
                q.created_at,
                q.updated_at
                from public.rms_quotation q
                left join public.rms_quotation_items qi on q.id = qi."quotationId"
                left join public.rms_items i on qi."itemId" = i.id
                left join public.users u on q."createdBy" = u."userId"
                left join public.users u2 on q."updatedBy" = u2."userId"
            ${whereSQL}
            ORDER BY q.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;

        const data = await AppDataSource.query(query, [...params, limit, offset]);

        const countResult = await AppDataSource.query(
            `SELECT COUNT(*) FROM rms_quotation`
        );

        const total = parseInt(countResult[0].count, 10);

        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    // ✅ EDIT (single with items)
    public async edit(id: number): Promise<any> {

        const query = `
            SELECT
                q.id,
                q."refNumber",
                q."companyName",
                q."companyEmail",
                q.subject,
                q.discriptions,
                q.created_at AS "createdAt",
                q.updated_at AS "updatedAt",
                qi."itemId",
                i."itemName",
                i."itemType",
                i."itemModel",
                i."itemConfigurations",
                i."itemPrice",
                qi."rmsPrice",
                qi."quarterly"
            FROM rms_quotation q
            LEFT JOIN rms_quotation_items qi ON qi."quotationId" = q.id
            LEFT JOIN rms_items i ON i.id = qi."itemId"
            WHERE q.id = $1
        `;

        const rows = await AppDataSource.query(query, [id]);

        if (!rows.length) return null;

        // ✅ GROUP DATA
        const quotation = {
            id: rows[0].id,
            refNumber: rows[0].refNumber,
            companyName: rows[0].companyName,
            companyEmail: rows[0].companyEmail,
            subject: rows[0].subject,
            discriptions: rows[0].discriptions,
            items: rows.map((r: any) => ({
                itemId: r.itemId,
                itemName: r.itemName,
                itemType: r.itemType,
                itemModel: r.itemModel,
                itemConfigurations: r.itemConfigurations,
                itemPrice: Number(r.itemPrice),
                rmsPrice: Number(r.rmsPrice),
                quarterly: Number(r.quarterly)
            }))
        };

        return quotation;
    }

    // ✅ UPDATE (Parent + Replace Items)
    public async update(
        id: number,
        data: Partial<IRmsQuotation>,
        items: IRmsQuotationItem[]
    ): Promise<any> {

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 👉 Update quotation
            await queryRunner.manager.update(RmsQuotationModel, id, {
                refNumber: data.refNumber,
                companyName: data.companyName,
                companyEmail: data.companyEmail ?? undefined,
                subject: data.subject,
                discriptions: data.discriptions,
                updatedBy: data.updatedBy ?? undefined
            });

            // 👉 Delete old items
            await queryRunner.manager.delete(RmsQuotationItemModel, {
                quotationId: id
            });

            // 👉 Insert new items
            if (items && items.length > 0) {
                const newItems = items.map(item => ({
                    quotationId: id,
                    itemId: item.itemId,
                    rmsPrice: item.rmsPrice,
                    quarterly: item.quarterly ?? null,
                    createdBy: data.updatedBy
                }));

                const entities = queryRunner.manager.create(RmsQuotationItemModel, newItems);
                await queryRunner.manager.save(entities);
            }

            await queryRunner.commitTransaction();

            return {
                status: true,
                message: "Updated successfully"
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Update failed:", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // ✅ DROPDOWN
    public async getDataByItemId(): Promise<{ id: string; label: string }[]> {
        const query = `
            SELECT
                i.id,
                CONCAT(
                    i."itemName",' | ',
                    i."itemPrice",' | ',
                    i."itemModel",' | ',
                    COALESCE(i."itemConfigurations",'')
                ) AS label,
                i."itemPrice",
                i."itemName",
                i."itemModel",
                i."itemType",
                i."itemConfigurations"
            FROM public.rms_items i
            ORDER BY i."itemName"
        `;

        return await AppDataSource.query(query);
    }
}