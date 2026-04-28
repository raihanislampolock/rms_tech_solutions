import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { RmsDeliveryModel } from "./rms.delivery.model";

@Entity("rms_delivery_items")
export class RmsDeliveryItemModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: "deliveryId", type: "int" })
    deliveryId!: number;

    @Column({ name: "itemId", type: "int" })
    itemId!: number;

    @Column({ name: "deliveredQuantity", type: "int", nullable: true })
    deliveredQuantity?: number;

    @Column({ name: "notes", type: "text", nullable: true })
    notes?: string;

    @Column({ name: "createdBy", type: "int", nullable: true })
    createdBy?: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

    // Relations
    @ManyToOne(() => RmsDeliveryModel, delivery => delivery.items, { onDelete: "CASCADE" })
    @JoinColumn({ name: "deliveryId" })
    delivery!: RmsDeliveryModel;
}