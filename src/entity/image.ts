import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { user_service } from "./user_service";

@Entity()
export class image {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    service_id: number;
    @ManyToOne(type => user_service)
    @JoinColumn({ name: "service_id" })
    service: user_service;

    @Index()
    @Unique(["filename"])
    @Column({ nullable: false,  type: "varchar", length: 100 })
    filename: string;
    
    @Column({default: () => "now()", nullable: false})
    created: Date;
}