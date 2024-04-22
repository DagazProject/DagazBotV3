import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { macro } from "./macro";

@Entity()
export class macro_param {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    macro_id: number;
    @ManyToOne(type => macro)
    @JoinColumn({ name: "macro_id" })
    macro: macro;

    @Column({ nullable: false,  type: "varchar", length: 10 })
    name: string;

    @Column({ nullable: true,  type: "varchar", length: 10 })
    value: string;

    @Column({ type: "integer", nullable: false })
    order_num: number;
}