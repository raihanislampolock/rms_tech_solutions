import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { RmsQuotationModel } from "./rms.quotation.model";
import { RmsInvoiceItemModel } from "./rms.invoice.item.model";

@Entity("rms_invoices")
export class RmsInvoiceModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, unique: true })
    invoiceNumber!: string;

    @Column({ type: "int", nullable: true })
    quotationId?: number;

    @Column({ type: "int", nullable: true })
    challanId?: number;

    @Column({ type: "varchar", length: 255 })
    companyName!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    companyEmail?: string;

    @Column({ type: "text", nullable: true })
    notes?: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    invoiceStatus?: string; // 'pending', 'paid', 'cancelled'

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    totalAmount?: number;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    taxAmount?: number;

    @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
    discountAmount?: number;

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

    @OneToMany(() => RmsInvoiceItemModel, invoiceItem => invoiceItem.invoice, { cascade: true })
    items?: RmsInvoiceItemModel[];
}