import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { service } from "./service";

@Entity()
export class info {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    service_id: number;
    @ManyToOne(type => service)
    @JoinColumn({ name: "service_id" })
    service: service;

    @Column({ nullable: false,  type: "text" })
    ru: string;

    @Column({ nullable: false,  type: "text" })
    en: string;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_mandatory: boolean;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}