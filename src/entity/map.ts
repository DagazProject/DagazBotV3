import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { users } from "./users";
import { script } from "./script";

@Entity()
export class map {
    @PrimaryColumn()
    id: number;

    @Index()
    @Column({ nullable: true })
    parent_id: number;
    @ManyToOne(type => map)
    @JoinColumn({ name: "parent_id" })
    parent: map;

    @Index()
    @Column({ nullable: true })
    user_id: number;
    @ManyToOne(type => users)
    @JoinColumn({ name: "user_id" })
    user: users;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Column({ type: "varchar", length: 5, nullable: false })
    lang: string;

    @Index()
    @Column({ nullable: true })
    script_id: number;
    @ManyToOne(type => script)
    @JoinColumn({ name: "script_id" })
    script: script;

    @Column({ nullable: false })
    order_num: number;

    @Column({ nullable: true })
    width: number;
}