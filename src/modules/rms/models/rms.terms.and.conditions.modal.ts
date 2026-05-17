import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("rms_terms_and_conditions")
export class RmsTermsAndConditionsModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, nullable: true })
    timeLine!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    payment!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    warranty!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    remarks!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    updatedBy!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

}