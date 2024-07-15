import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { service } from "./service";
import { session_type } from "./session_type";
import { script } from "./script";

@Entity()
export class session {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    sessiontype_id: number;
    @ManyToOne(type => session_type)
    @JoinColumn({ name: "sessiontype_id" })
    sessiontype: session_type;

    @Index()
    @Column({ nullable: false })
    service_id: number;
    @ManyToOne(type => service)
    @JoinColumn({ name: "service_id" })
    service: service;

    @Index()
    @Column({ nullable: false })
    script_id: number;
    @ManyToOne(type => script)
    @JoinColumn({ name: "script_id" })
    script: script;

    @Column({ type: "integer", default: 0, nullable: false })
    slot_index: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}