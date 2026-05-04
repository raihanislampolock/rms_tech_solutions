import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { RmsPurchaseModel } from "./rms.purchase.model";
import { RmsItemsModel } from "./rms.items.model";

@Entity("rms_purchase_items")
export class RmsPurchaseItemModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "int", nullable: true })
    purchaseId!: number;

    @Column({ type: "int", nullable: true })
    itemId!: number;

    @Column({ type: "int", nullable: true })
    quantity!: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    unitPrice!: string;

    @Column({ type: "varchar", length: 500, nullable: true })
    totalPrice!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    notes!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    updatedBy!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

    @ManyToOne(() => RmsPurchaseModel, purchase => purchase.items, { onDelete: "CASCADE" })
    @JoinColumn({ name: "purchaseId" })
    purchase!: RmsPurchaseModel;

    @ManyToOne(() => RmsItemsModel, { eager: true })
    @JoinColumn({ name: "itemId" })
    item?: RmsItemsModel;

}