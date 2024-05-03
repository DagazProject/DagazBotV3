import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { service } from "./service";

@Entity()
export class global_param {
    @PrimaryColumn()
    id: number;

    @Index()
    @Column({ nullable: true })
    service_id: number;
    @ManyToOne(type => service)
    @JoinColumn({ name: "service_id" })
    service: service;
    
    @Column({ nullable: false,  type: "varchar", length: 300 })
    name: string;

    @Column({ type: "integer", nullable: true })
    min_value: number;

    @Column({ type: "integer", nullable: true })
    max_value: number;

    @Column({ type: "integer", default: 0, nullable: false })
    def_value: number;
}