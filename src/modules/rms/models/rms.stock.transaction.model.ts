import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { RmsItemsModel } from "./rms.items.model";

@Entity("rms_stock_transactions")
export class RmsStockTransactionModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: "itemId", type: "int" })
    itemId!: number;

    @Column({ name: "referenceType", type: "varchar", length: 50 })
    referenceType!: string;

    @Column({ name: "referenceId", type: "int", nullable: true })
    referenceId?: number;

    @Column({ name: "transactionType", type: "varchar", length: 20 })
    transactionType!: string;

    @Column({ name: "quantity", type: "int" })
    quantity!: number;

    @Column({ name: "previousQuantity", type: "int", default: 0 })
    previousQuantity!: number;

    @Column({ name: "newQuantity", type: "int" })
    newQuantity!: number;

    @Column({ name: "notes", type: "text", nullable: true })
    notes?: string;

    @Column({ name: "createdBy", type: "int", nullable: true })
    createdBy?: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @ManyToOne(() => RmsItemsModel, { eager: true })
    @JoinColumn({ name: "itemId" })
    item?: RmsItemsModel;
}
