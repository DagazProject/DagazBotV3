import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Unique } from "typeorm";
import { user_service } from "./user_service";

@Entity()
@Unique(["commonname", "lang", "version"])
export class script {
    @PrimaryColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    service_id: number;
    @ManyToOne(type => user_service)
    @JoinColumn({ name: "service_id" })
    service: user_service;

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