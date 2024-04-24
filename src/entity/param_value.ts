import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { param_type } from "./param_type";
import { user_context } from "./user_context";

@Entity()
export class param_value {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    context_id: number;
    @ManyToOne(type => user_context)
    @JoinColumn({ name: "context_id" })
    context: user_context;

    @Index()
    @Column({ nullable: true })
    param_id: number;
    @ManyToOne(type => param_type)
    @JoinColumn({ name: "param_id" })
    param: param_type;

    @Column({ nullable: true,  type: "text" })
    ix: number;

    @Column({ nullable: false,  default: true })
    hidden: boolean;

    @Column({ nullable: false,  type: "text" })
    value: string;

    @Column({default: () => "now()", nullable: false})
    updated: Date;
}