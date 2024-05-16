import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreditCheckFile } from '../../entities/credit-check-file.entity';
import { CreditCheckHistory } from '../../entities/credit-check-history.entity';
import { CreditCheck } from '../../entities/credit-check.entity';
import { Connection, EntityManager, In, LessThan, Not, Repository } from 'typeorm';
import { CurrentUserDto } from '../auth/dtos/current-user.dto';
import { CreateCreditCheckRequest } from './dtos/create-credit-check-request.dto';
import { Company } from '../../entities/company.entity';
import { CompaniesService } from '../companies/companies.service';
import { User } from '../../entities/user.entity';
import { UsersService } from '../users/users.service';
import { S3Service } from '../../s3/s3.service';
import * as crypto from 'crypto';
import { Upload } from '../settings/dtos/upload-file.dto';
import {
  CreditCheckFileCategory,
  CreditCheckStatus,
} from '../../enums/credit-check';
import { PaginatedResult } from '../third-parties/dtos/pagination-response.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class CreditCheckService {
  constructor(
    @InjectRepository(CreditCheck)
    private creditCheckRepository: Repository<CreditCheck>,
    @InjectRepository(CreditCheckFile)
    private creditCheckFileRepository: Repository<CreditCheckFile>,
    @InjectRepository(CreditCheckHistory)
    private creditCheckHistoryRepository: Repository<CreditCheckHistory>,
    private companyService: CompaniesService,
    private connection: Connection,
    private userService: UsersService,
    private s3Service: S3Service,
    private mailService: MailService,
  ) {}

  public async createCreditCheck(
    user: CurrentUserDto,
    body: CreateCreditCheckRequest,
    file: Express.Multer.File,
  ) {
    const userCompany: Company = await this.companyService.findById(
      user.companyId,
    );

    const creditCheck: CreditCheck = this.constructCreditCheckData(
      user,
      body,
      userCompany,
    );

    const currentUser: User = await this.userService.getOneUserEntityById(
      user.userId,
      user.companyId,
    );

    return await this.connection.transaction(
      async (entityManager: EntityManager) => {
        const savedCreditCheck = await entityManager.save(
          CreditCheck,
          creditCheck,
        );

        const creditCheckHistory = this.constructCreditCheckHistory(
          'Created',
          'Create credit check',
          savedCreditCheck,
          currentUser,
        );

        await entityManager.save(CreditCheckHistory, creditCheckHistory);

        if (file) {
          const creditCheckFile = await this.constructCreditCheckFile(
            user,
            file,
            savedCreditCheck,
            CreditCheckFileCategory.ATTACHMENT,
          );

          await entityManager.save(CreditCheckFile, creditCheckFile);
        }
        delete savedCreditCheck.company;
        return savedCreditCheck;
      },
    );
  }

  public async getCreditCheckListPaged(
    page: number,
    perPage: number,
    filter: string,
    creditCheckStatus: CreditCheckStatus,
    filterDateRange: string,
    user: CurrentUserDto,
  ): Promise<PaginatedResult<CreditCheck>> {
    const query = this.constructGetCreditCheckListPagedQuery(
      user.companyId,
      creditCheckStatus,
      filterDateRange,
      page,
      perPage,
      filter,
    );

    const totalRecord = await query.getCount();

    const data = await query.getMany();

    const response: PaginatedResult<CreditCheck> = {
      page,
      totalRecord,
      totalShowed: data.length,
      totalPage: Math.ceil(totalRecord / perPage),
      showing: `${totalRecord ? (page - 1) * perPage + 1 : 0} - ${
        (page - 1) * perPage + data.length
      } of ${totalRecord}`,
      next: (page - 1) * perPage + data.length !== totalRecord,
      data,
    };

    return response;
  }

  public async getCreditCheckDetail(
    id: number,
    user: CurrentUserDto,
  ): Promise<any> {
    const creditCheck = await this.creditCheckRepository
      .createQueryBuilder('cc')
      .innerJoin('cc.company', 'c')
      .innerJoin('cc.creditCheckHistories', 'cch')
      .innerJoin('cch.createdBy', 'cchu')
      .leftJoin('cc.creditCheckFiles', 'ccf', 'ccf.status = :activeStatus')
      .select([
        'cc.id',
        'cc.companyName',
        'cc.npwp',
        'cc.picName',
        'cc.phoneCode',
        'cc.phoneNumber',
        'cc.location',
        'cc.checkStatus',
        'cc.createdAt',
        'cch.id',
        'cch.action',
        'cch.details',
        'cch.createdAt',
        'ccf.id',
        'ccf.fileContainer',
        'ccf.fileName',
        'ccf.originalName',
        'ccf.url',
        'ccf.category',
        'cchu.userId',
        'cchu.fullName',
      ])
      .where(
        `
          c.id = :companyId
          AND cc.id = :id
          AND cc.status = :activeStatus
          AND cch.status = :activeStatus
        `,
      )
      .setParameters({
        companyId: user.companyId,
        id,
        activeStatus: 1,
      })
      .getOne();

    if (!creditCheck) {
      return null;
    } else {
      const groupedByCategory = creditCheck.creditCheckFiles.reduce(
        (acc, obj) => {
          const category = obj.category;
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(obj);
          return acc;
        },
        {},
      );

      return {
        id: creditCheck.id,
        companyName: creditCheck.companyName,
        npwp: creditCheck.npwp,
        picName: creditCheck.picName,
        phoneCode: creditCheck.phoneCode,
        phoneNumber: creditCheck.phoneNumber,
        location: creditCheck.location,
        checkStatus: creditCheck.checkStatus,
        createdAt: creditCheck.createdAt,
        creditCheckHistories: [...creditCheck.creditCheckHistories],
        creditCheckAttachment:
          groupedByCategory[CreditCheckFileCategory.ATTACHMENT],
        creditCheckPaymentProof:
          groupedByCategory[CreditCheckFileCategory.PAYMENT_PROOF],
        creditCheckVendor: groupedByCategory[CreditCheckFileCategory.VENDOR],
      };
    }
  }

  public async submitPaymentProof(
    id: number,
    file: Express.Multer.File,
    user: CurrentUserDto,
  ): Promise<void> {
    const creditCheck = await this.creditCheckRepository.findOne({
      where: {
        id,
        company: {
          id: user.companyId,
        },
        status: 1,
      },
    });
    if (creditCheck && creditCheck.checkStatus !== CreditCheckStatus.EXPIRED) {
      const currentUser: User = await this.userService.getOneUserEntityById(
        user.userId,
        user.companyId,
      );

      const creditCheckFile = await this.constructCreditCheckFile(
        user,
        file,
        creditCheck,
        CreditCheckFileCategory.PAYMENT_PROOF,
      );

      await this.creditCheckFileRepository.save(creditCheckFile);
      creditCheck.checkStatus = CreditCheckStatus.WAITING_FOR_CONFIRMATION;
      await this.creditCheckRepository.save(creditCheck);
      const creditCheckHistory = this.constructCreditCheckHistory(
        'Proof of payment',
        'Upload proof of payment',
        creditCheck,
        currentUser,
      );
      await this.creditCheckHistoryRepository.save(creditCheckHistory);
      await this.informProofOfPaymentSubmission(id, user.email, user.companyId);
    } else {
      throw new NotFoundException('Credit Check not found or has expired');
    }
  }

  public async getAttachmentFileByFileNameAndFileId(
    fileName: string,
    user: CurrentUserDto,
    fileId: number,
  ) {
    return await this.creditCheckFileRepository
      .createQueryBuilder('ccf')
      .innerJoin('ccf.creditCheck', 'cc')
      .innerJoin('cc.company', 'c')
      .select(['ccf', 'cc', 'c'])
      .where(
        `
          ccf.fileName = :fileName
          AND ccf.id = :fileId
          AND ccf.status = :activeStatus
          AND c.id = :companyId
          AND cc.status = :activeStatus
        `,
      )
      .setParameters({
        fileName,
        fileId,
        activeStatus: 1,
        companyId: user.companyId,
      })
      .getOne();
  }

  public async expireCreditCheck() {
    await this.creditCheckRepository.update(
      {
        createdAt: LessThan(
          new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days * 1 day in milliseconds
        ),
        status: 1,
        checkStatus: Not(
          In([CreditCheckStatus.DONE_CHECKING, CreditCheckStatus.EXPIRED]),
        ),
      },
      { checkStatus: CreditCheckStatus.EXPIRED },
    );
  }

  private constructCreditCheckData(
    user: CurrentUserDto,
    body: CreateCreditCheckRequest,
    company: Company,
  ): CreditCheck {
    return {
      ...body,
      createdBy: user.userId,
      company,
    };
  }

  private constructCreditCheckHistory(
    action: string,
    details: string,
    creditCheck: CreditCheck,
    createdBy: User,
  ): CreditCheckHistory {
    return {
      action,
      details,
      creditCheck,
      createdBy,
    };
  }

  private async constructCreditCheckFile(
    currentUser: CurrentUserDto,
    file: Express.Multer.File,
    creditCheck: CreditCheck,
    category: CreditCheckFileCategory,
  ): Promise<CreditCheckFile> {
    const pdfExtension = ['pdf'];
    const imageExtension = ['jpg', 'jpeg', 'png'];
    const filenameSplit = file.originalname.split('.');
    const fileExt = filenameSplit[filenameSplit.length - 1];
    const fileName = `${crypto.randomBytes(32).toString('hex')}.${fileExt}`;

    const upload: Upload = {
      file,
      fileName,
      fileExt,
      fileSize: file.size,
      mimeType: file.mimetype,
      companyId: currentUser.companyId,
    };

    let url;

    if (pdfExtension.includes(fileExt)) {
      url = await this.s3Service.uploadPDF({
        type: upload.fileExt,
        hashedFileName: upload.fileName,
        buffer: upload.file.buffer,
      });
    } else if (imageExtension.includes(fileExt)) {
      url = await this.s3Service.uploadPhoto(upload);
    }

    return {
      fileContainer: 'saas',
      fileName,
      originalName: file.originalname,
      url,
      category,
      creditCheck,
      createdBy: currentUser.userId,
      fileSize: file.size,
    };
  }

  private constructGetCreditCheckListPagedQuery(
    companyId: number,
    creditCheckStatus: CreditCheckStatus,
    filterDateRange: string,
    page: number,
    perPage: number,
    filter: string,
  ) {
    const query = this.creditCheckRepository
      .createQueryBuilder('cc')
      .innerJoin('cc.company', 'c')
      .select([
        'cc.id',
        'cc.companyName',
        'cc.npwp',
        'cc.createdAt',
        'cc.checkStatus',
      ])
      .where(
        `
          c.id = :companyId
          AND cc.checkStatus IN(:creditCheckStatuses)
          AND cc.status = :activeStatus
        `,
      )
      .setParameters({
        companyId,
        creditCheckStatuses: creditCheckStatus
          ? [creditCheckStatus]
          : [
              CreditCheckStatus.DONE_CHECKING,
              CreditCheckStatus.EXPIRED,
              CreditCheckStatus.IN_PROGRESS,
              CreditCheckStatus.WAITING_FOR_CONFIRMATION,
              CreditCheckStatus.WAITING_FOR_PAYMENT,
            ],
        activeStatus: 1,
      })
      .orderBy('cc.createdAt', 'DESC')
      .limit(perPage)
      .offset(perPage * (page - 1));

    if (filterDateRange) {
      const tokenizedFilterDateRange = filterDateRange.split('to');
      const fromDateFilter = new Date(tokenizedFilterDateRange[0]);
      const untilDateFilter = new Date(tokenizedFilterDateRange[1]);

      query.andWhere(
        `(DATE(cc.createdAt) >= :from AND DATE(cc.createdAt) <= :until)`,
        { from: fromDateFilter, until: untilDateFilter },
      );
    }

    if (filter) {
      query.andWhere(
        `
          cc.companyName LIKE :filter
          OR cc.npwp LIKE :filter
        `,
        {
          filter: `%${filter}%`,
        },
      );
    }

    return query;
  }

  private async informProofOfPaymentSubmission(
    creditCheckId: number,
    fromEmail: string,
    companyId: number,
  ) {
    const creditCheck = await this.creditCheckRepository
      .createQueryBuilder('cc')
      .innerJoin('cc.company', 'c')
      .leftJoin(
        'cc.creditCheckFiles',
        'ccf',
        'ccf.status = :activeStatus AND ccf.category IN(:categories)',
      )
      .select(['cc', 'c', 'ccf'])
      .where(
        `
          c.id = :companyId
          AND c.status = :activeStatus
          AND cc.status = :activeStatus
          AND cc.id = :creditCheckId
        `,
      )
      .setParameters({
        activeStatus: 1,
        categories: [
          CreditCheckFileCategory.ATTACHMENT,
          CreditCheckFileCategory.PAYMENT_PROOF,
        ],
        companyId,
        creditCheckId,
      })
      .getOne();

    const pdfExtension = ['pdf'];

    const attachment = creditCheck.creditCheckFiles.find((file) => {
      return file.category === CreditCheckFileCategory.ATTACHMENT;
    });
    const proof = creditCheck.creditCheckFiles.find((file) => {
      return file.category === CreditCheckFileCategory.PAYMENT_PROOF;
    });
    let attachmentBlob;
    if (attachment) {
      const fileExt = attachment.fileName.split('.').pop();
      if (pdfExtension.includes(fileExt)) {
        attachment.fileName = `${fileExt}_${attachment.fileName}`;
      }
      attachmentBlob = await this.s3Service.getFileBuffer(attachment.fileName);
    }
    const fileExt = proof.fileName.split('.').pop();
    if (pdfExtension.includes(fileExt)) {
      proof.fileName = `${fileExt}_${proof.fileName}`;
    }
    const proofBlob = await this.s3Service.getFileBuffer(proof.fileName);
    let attachmentObject;
    if (attachment) {
      attachmentObject = {
        name: attachment.originalName,
        buffer: attachmentBlob,
      };
    }

    const year = new Date().getFullYear();

    await this.mailService.informProofOfPaymentSubmission(
      fromEmail,
      attachmentObject,
      {
        name: proof.originalName,
        buffer: proofBlob,
      },
      {
        prevYear: +year - 1,
        year,
        ffName: creditCheck.company.name,
        companyName: creditCheck.companyName,
        picName: creditCheck.picName,
        npwp: creditCheck.npwp,
        phoneNumber: `+${creditCheck.phoneCode}${creditCheck.phoneNumber}`,
        location: creditCheck.location,
      },
    );
  }
}
