import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { RmsQuotationModel } from "./rms.quotation.model";
import { RmsDeliveryItemModel } from "./rms.delivery.item.model";

@Entity("rms_deliveries")
export class RmsDeliveryModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, unique: true })
    deliveryNumber!: string;

    @Column({ type: "int", nullable: true })
    quotationId?: number;

    @Column({ type: "varchar", length: 255 })
    companyName!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    companyEmail?: string;

    @Column({ type: "text", nullable: true })
    notes?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    deliveryStatus?: string; // 'pending', 'delivered', 'cancelled'

    @Column({ type: "int", nullable: true })
    createdBy?: number;

    @Column({ type: "int", nullable: true })
    updatedBy?: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    // Relations
    @ManyToOne(() => RmsQuotationModel, { nullable: true })
    @JoinColumn({ name: "quotationId" })
    quotation?: RmsQuotationModel;

    @OneToMany(() => RmsDeliveryItemModel, deliveryItem => deliveryItem.delivery, { cascade: true })
    items?: RmsDeliveryItemModel[];
}