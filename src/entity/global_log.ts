import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { global_value } from "./global_value";
import { delta_type } from "./delta_type";
import { script } from "./script";

@Entity()
export class global_log {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    value_id: number;
    @ManyToOne(type => global_value)
    @JoinColumn({ name: "value_id" })
    value: global_value;

    @Index()
    @Column({ nullable: false })
    type_id: number;
    @ManyToOne(type => delta_type)
    @JoinColumn({ name: "type_id" })
    type: delta_type;

    @Index()
    @Column({ nullable: false })
    script_id: number;
    @ManyToOne(type => script)
    @JoinColumn({ name: "script_id" })
    script: script;

    @Column({ type: "integer", nullable: false })
    delta_value: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}