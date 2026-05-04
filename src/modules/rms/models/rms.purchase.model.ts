import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { RmsPurchaseItemModel } from "./rms.purchase.item.model";

@Entity("rms_purchases")
export class RmsPurchaseModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50 })
    purchaseNumber!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    supplierName!: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    supplierEmail!: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    purchaseStatus!: string | null;

    @Column({ type: "varchar", length: 500, nullable: true })
    notes!: string | null;

    @Column({ type: "varchar", length: 500, nullable: true })
    files!: string | null;

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string | null;

    @Column({ type: "varchar", length: 50, nullable: true })
    updatedBy!: string | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => RmsPurchaseItemModel, i => i.purchase)
    items?: RmsPurchaseItemModel[];
}

