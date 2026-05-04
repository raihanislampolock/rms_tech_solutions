import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";
import { RmsItemsModel } from "./rms.items.model";

@Entity("rms_item_stocks")
@Unique(["itemId"])
export class RmsItemStockModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "int", nullable: true })
    itemId!: number;

    @Column({ type: "int", nullable: true })
    onHandQuantity!: number;

    @Column({ type: "int", nullable: true })
    reservedQuantity!: number;

    @Column({ type: "int", nullable: true })
    availableQuantity!: number;

    @Column({ type: "varchar", length: 500, nullable: true })
    lastPurchasePrice!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    lastPurchaseDate!: Date;

    @Column({ type: "varchar", length: 500, nullable: true })
    notes!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    updatedBy!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

    @ManyToOne(() => RmsItemsModel, { eager: true })
    @JoinColumn({ name: "itemId" })
    item?: RmsItemsModel;

}
