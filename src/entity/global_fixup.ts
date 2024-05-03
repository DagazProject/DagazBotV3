import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { global_param } from "./global_param";
import { script } from "./script";

@Entity()
export class global_fixup {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    param_id: number;
    @ManyToOne(type => global_param)
    @JoinColumn({ name: "param_id" })
    param: global_param;

    @Index()
    @Column({ nullable: false })
    script_id: number;
    @ManyToOne(type => script)
    @JoinColumn({ name: "script_id" })
    script: script;

    @Column({ type: "integer", nullable: false })
    param_num: number;
}