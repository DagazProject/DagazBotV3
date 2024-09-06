import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Unique } from "typeorm";
import { session_type } from "./session_type";
import { service } from "./service";
import { users } from "./users";

@Entity()
@Unique(["commonname", "lang", "version"])
export class script {
    @PrimaryColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    service_id: number;
    @ManyToOne(type => service)
    @JoinColumn({ name: "service_id" })
    service: service;

    @Index()
    @Column({ nullable: false })
    user_id: number;
    @ManyToOne(type => users)
    @JoinColumn({ name: "user_id" })
    user: users;

    @Index()
    @Column({ nullable: true })
    sessiontype_id: number;
    @ManyToOne(type => session_type)
    @JoinColumn({ name: "sessiontype_id" })
    sessiontype: session_type;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    commonname: string;

    @Index()
    @Unique(["filename"])
    @Column({ nullable: false,  type: "varchar", length: 100 })
    filename: string;

    @Column({ type: "integer", default: 0, nullable: true })
    version: number;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_shared: boolean;

    @Column({ type: "varchar", length: 5, nullable: false })
    lang: string;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_default: boolean;

    @Column({ type: "integer", default: 0, nullable: false })
    win_bonus: number;

    @Column({ type: "integer", default: 0, nullable: false })
    death_penalty: number;
    
    @Column({ type: "integer", default: 0, nullable: false })
    priority: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}