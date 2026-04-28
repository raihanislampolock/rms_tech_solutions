import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

@Entity("rms_items")
export class RmsItemsModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, nullable: true })
    itemType!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    manufactureOrigin!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    itemName!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    itemPrice!: string;

    @Column({ type: "varchar", length: 500, nullable: true })
    itemConfigurations!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    itemModel!: string;

    @Column({ type: "varchar", length: 500, nullable: true })
    files!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    updatedBy!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

}