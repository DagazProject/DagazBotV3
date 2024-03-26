import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { action } from "./action";
import { param_type } from "./param_type";

@Entity()
export class response_param {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    action_id: number;
    @ManyToOne(type => action)
    @JoinColumn({ name: "action_id" })
    action: action;
    
    @Column({ type: "varchar", length: 100, nullable: false })
    name: string;

    @Index()
    @Column({ nullable: true })
    param_id: number;
    @ManyToOne(type => param_type)
    @JoinColumn({ name: "param_id" })
    param: param_type;

    @Column({ type: "integer", nullable: false })
    order_num: number;
}