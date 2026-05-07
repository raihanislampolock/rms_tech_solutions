import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { RmsChallanModel } from "./rms.challan.model";

@Entity("rms_challan_items")
export class RmsChallanItemModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: "challanId", type: "int" })
    challanId!: number;

    @Column({ name: "itemId", type: "int" })
    itemId!: number;

    @Column({ name: "deliveredQuantity", type: "int", nullable: true })
    deliveredQuantity?: number;

    @Column({ name: "notes", type: "text", nullable: true })
    notes?: string;

    @Column({ name: "createdBy", type: "varchar", length: 255, nullable: true })
    createdBy?: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

    // Relations
    @ManyToOne(() => RmsChallanModel, challan => challan.items, { onDelete: "CASCADE" })
    @JoinColumn({ name: "challanId" })
    challan!: RmsChallanModel;
}