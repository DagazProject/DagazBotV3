import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { user_service } from "./user_service";

@Entity()
export class script {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    service_id: number;
    @ManyToOne(type => user_service)
    @JoinColumn({ name: "service_id" })
    service: user_service;

    @Index()
    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Index()
    @Unique(["username"])
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
    priority: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}