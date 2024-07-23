import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { user_service } from "./user_service";
import { users } from "./users";

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
    @Column({ nullable: false })
    user_id: number;
    @ManyToOne(type => users)
    @JoinColumn({ name: "user_id" })
    user: users;

    @Column({ nullable: false,  type: "varchar", length: 100 })
    name: string;

    @Column({ type: "integer", default: 0, nullable: true })
    version: number;

    @Index()
    @Unique(["filename"])
    @Column({ nullable: false,  type: "varchar", length: 100 })
    filename: string;
    
    @Column({default: () => "now()", nullable: false})
    created: Date;
}