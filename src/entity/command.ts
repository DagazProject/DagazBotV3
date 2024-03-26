import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { service } from "./service";

@Entity()
export class command {
    @PrimaryColumn()
    id: number;

    @Index()
    @Column({ nullable: true })
    service_id: number;
    @ManyToOne(type => service)
    @JoinColumn({ name: "service_id" })
    service: service;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Column({ type: "integer", default: 0, nullable: false })
    priority: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;

    @Column({ nullable: false,  type: "boolean", default: true })
    is_visible: boolean;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_default: boolean;

    @Column({ type: "integer", default: 0, nullable: false })
    order_num: number;
}