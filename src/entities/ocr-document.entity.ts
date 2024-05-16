
import { Company } from './company.entity';
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { OcrDocumentHistory } from './ocr-document-history.entity';

@Entity({ name : 'ocr_document'})
export class OcrDocument {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({
        name: 'url',
        nullable: false,
    })
    url: string;

    @Column({
        name: 'file_name',
        nullable: false,
    })
    fileName: string;

    @Column({
        name: 'original_name',
        nullable: false,
    })
    originalName: string;

    @Column({
        name: 'file_size',
        nullable: false,
    })
    fileSize: number; // bytes

    @Column({
        name : 'format_file',
        nullable: false,
    })
    formatFile : string;

    @Column({
        name : 'file_container',
        nullable: false,
    })
    fileContainer : string;

    @Column({
        name : 'converted_data',
        nullable: true,
        type: 'json',
    })
    convertedData : any;

    @Column({
        name: 'company_id',
    })
    companyId: number;

    @Column({
        name: 'status',
        nullable: false,
        default: 1,
    })
    status?: number;

    @Column({
        name : 'created_by_user_id',
        nullable: true,
    })
    createdBy? : number;

    @Column({
        name : 'updated_by_user_id',
        nullable: true,
    })
    updatedBy? : number;

    @Column({
        name : 'deleted_by_user_id',
        nullable: true,
    })
    deletedBy? : number;
    
    @Column({
        name: 'created_at',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt?: Date;

    @Column({
        name: 'updated_at',
        type: 'datetime',
        default: () => 'CURRENT_TIMESTAMP',
    })
    updatedAt?: Date;

    @Column({
        name: 'deleted_at',
        type: 'datetime',
        nullable: true,
    })
    deletedAt?: Date;

    // relations
    @OneToMany(
        () => OcrDocumentHistory,
        (ocrDocumentHistory) => ocrDocumentHistory.ocrDocument,
    )
    ocrDocumentHistory?: OcrDocumentHistory[];
    
    @ManyToOne(() => Company, (company) => company.ocrDocument)
    @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
    company: Company;
}