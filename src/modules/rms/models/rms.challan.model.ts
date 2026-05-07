import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany
} from "typeorm";

import { RmsQuotationModel } from "./rms.quotation.model";
import { RmsChallanItemModel } from "./rms.challan.item.model";

@Entity("rms_challans")
export class RmsChallanModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: "challanNumber", type: "varchar", length: 50, unique: true })
    challanNumber!: string;

    @Column({ name: "quotationId", type: "int", nullable: true })
    quotationId?: number;

    @Column({ name: "companyName", type: "varchar", length: 255 })
    companyName!: string;

    @Column({ name: "companyEmail", type: "varchar", length: 255, nullable: true })
    companyEmail?: string;

    @Column({ name: "notes", type: "text", nullable: true })
    notes?: string;

    @Column({
        name: "challanStatus",
        type: "varchar",
        length: 50,
        default: "pending"
    })
    challanStatus!: "pending" | "delivered" | "cancelled";

    @Column({ name: "createdBy", type: "varchar", length: 255, nullable: true })
    createdBy?: string;

    @Column({ name: "updatedBy", type: "varchar", length: 255, nullable: true })
    updatedBy?: string;

    @CreateDateColumn({ name: "created_at" }) // ✅ IMPORTANT (DB match)
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" }) // ✅ IMPORTANT
    updatedAt!: Date;

    // ========================
    // RELATIONS
    // ========================

    @ManyToOne(() => RmsQuotationModel, (q) => q.challans, { nullable: true })
    @JoinColumn({ name: "quotationId" })
    quotation?: RmsQuotationModel;

    @OneToMany(() => RmsChallanItemModel, (item) => item.challan)
    items!: RmsChallanItemModel[];
}