import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateCompanyDto } from 'src/freight-forwarder/settings/dtos/update-company.dto';
import { CreateQuotationNotesDto } from '../settings/dtos/create-quotation-notes.dto';

import { Company } from 'src/entities/company.entity';
import { SubscriptionHistory } from 'src/entities/subscription-history.entity';

import { S3Service } from 'src/s3/s3.service';
import { BlHistory } from '../../entities/bl-history.entity';
import { BlStatusType, BlType } from '../../enums/enum';
import { EAffiliation } from '../../enums/enum';
import { MailService } from '../../mail/mail.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(SubscriptionHistory)
    private subscriptionHistoryRepo: Repository<SubscriptionHistory>,
    @InjectRepository(BlHistory) private blHistoryRepo: Repository<BlHistory>,
    private readonly s3Service: S3Service,
    private mailService: MailService,
    private userService: UsersService,
  ) {}

  async findByName(name: string) {
    const company = await this.companyRepo.findOne({ name });
    return company;
  }

  async findById(id: number) {
    return await this.companyRepo.findOne({ id });
  }

  async update(userId: number, id: number, body: UpdateCompanyDto) {
    const company = await this.findById(id);
    if (!company) {
      throw new NotFoundException();
    }

    company.name = body.name;
    company.address = body.address;
    company.phoneCode = body.phoneCode;
    company.phoneNumber = body.phoneNumber;
    company.npwp = body.npwp;
    company.updatedByUserId = userId;

    return await this.companyRepo.save(company);
  }

  async updatePhoto(userId: number, id: number, upload: any) {
    try {
      const company = await this.companyRepo.findOne({ id });
      if (!company) {
        throw new NotFoundException();
      }

      const url = await this.s3Service.uploadPhoto(upload);
      if (company.logo) {
        await this.s3Service.deleteFiles([company.logo.split('/').pop()]);
      }

      company.logo = url;
      company.updatedByUserId = userId;

      return await this.companyRepo.save(company);
    } catch (error) {
      throw error;
    }
  }

  async updateHblTemplate(
    companyId: number,
    userId: number,
    originalName: string,
    upload,
    type: string,
  ) {
    try {
      const company = await this.companyRepo.findOne({ id: companyId });
      if (!company) {
        throw new NotFoundException();
      }

      const blHistory = new BlHistory();
      const url = await this.s3Service.uploadBlTemplate(upload);

      company.updatedByUserId = userId;
      await this.companyRepo.save(company);

      blHistory.originalName = originalName;
      blHistory.url = url;
      blHistory.companyId = company.id;
      blHistory.status = BlStatusType.VALIDATION;
      blHistory.activity = 'Upload HBL Template';
      await this.blHistoryRepo.save(blHistory);

      const recipients = await this.userService.getSuperAdminEmail();

      await this.mailService.sendBlUploadStatus(
        {
          email: `${company.name} <noreply.${company.email}>`,
          companyName: company.name,
        },
        recipients,
      );

      return {
        message: 'House Bill of Lading has been successfully uploaded!',
        data: {
          status: blHistory.status,
          fileName: blHistory.originalName,
          fileUrl: blHistory.url,
          requestedAt: new Date(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async downloadHblTemplate(
    companyId: number,
    documentId: number,
    response: any,
  ) {
    try {
      const company = await this.companyRepo.findOne({ id: companyId });
      if (!company) throw new NotFoundException('Company not found!');

      const blDocument = await this.blHistoryRepo.findOne({ id: documentId });
      if (!blDocument) throw new NotFoundException('Document Not Found');

      const fileName = blDocument.url.split('/').pop();

      return await this.s3Service.downloadFile(fileName, response);
    } catch (err) {
      throw err;
    }
  }

  async getHblHistory(companyId: number) {
    try {
      const blHistory = await this.blHistoryRepo.find({
        where: {
          companyId,
          type: 'HBL',
        },
      });
      if (!blHistory) throw new NotFoundException('Bl history not found!');

      return blHistory;
    } catch (err) {
      throw err;
    }
  }

  async changeColor(color: string, id: number, userId: number) {
    try {
      const company = await this.findById(id);
      if (company) {
        company.themeColor = color;
        company.updatedByUserId = userId;
        return await this.companyRepo.save(company);
      }
    } catch (error) {
      throw error;
    }
  }

  async createQuotationNote(userId, companyId, body: CreateQuotationNotesDto) {
    try {
      const company = await this.companyRepo.findOne({ id: companyId });
      Object.assign(company, {
        ...body,
        updatedByUserId: userId,
      });
      return await this.companyRepo.save(company);
    } catch (error) {
      throw error;
    }
  }

  async updateInvoiceRemark(userId, companyId, invoiceRemark) {
    try {
      const company = await this.companyRepo.findOne({ id: companyId });
      Object.assign(company, { invoiceRemark, updatedByUserId: userId });
      return await this.companyRepo.save(company);
    } catch (error) {
      throw error;
    }
  }

  async updatePriceDetailRemark(userId, companyId, priceDetailRemark) {
    try {
      const company = await this.companyRepo.findOne({ id: companyId });
      Object.assign(company, { priceDetailRemark, updatedByUserId: userId });
      return await this.companyRepo.save(company);
    } catch (error) {
      throw error;
    }
  }

  async getQuotationNote(companyId: number) {
    try {
      const quotationNotes = await this.companyRepo.findOne({ id: companyId });
      return quotationNotes;
    } catch (error) {
      throw error;
    }
  }

  async getCompanyProfile(companyId: number, preview = false) {
    if (preview) {
      const company = await this.companyRepo
        .createQueryBuilder('company')
        .leftJoinAndSelect('company.paymentAdvices', 'paymentAdvices')
        .leftJoinAndSelect('company.hblDynamicCompanyHistories', 'hblh')
        .where('company.id = :companyId AND company.status = :status', {
          companyId,
          status: 1,
        })
        .select([
          'company.name',
          'company.address',
          'company.npwp',
          'company.logo',
          'company.quotationNotes',
          'company.quotationRemark',
          'company.priceDetailRemark',
          'paymentAdvices',
          'hblh'
        ])
        .getOne();
        
      if (!company) {
        throw new NotFoundException('Company not found');
      }

      return company;
    }

    const company = await this.companyRepo
      .createQueryBuilder('company')
      .where('company.id = :companyId AND company.status = :status', {
        companyId,
        status: 1,
      })
      .leftJoinAndSelect('company.paymentAdvices', 'paymentAdvices')
      .leftJoinAndSelect('paymentAdvices.bank', 'bank')
      .leftJoinAndSelect('paymentAdvices.currency', 'currency')
      .leftJoinAndSelect('company.hblDynamicCompanyHistories', 'hblh','hblh.rfqNumber IS NULL AND hblh.status = :status')
      .leftJoinAndSelect('hblh.creator', 'hblhc')
      .select([
        'company.id',
        'company.email',
        'company.name',
        'company.address',
        'company.npwp',
        'company.quotationNotes',
        'company.quotationRemark',
        'company.phoneCode',
        'company.phoneNumber',
        'company.fileContainer',
        'company.logo',
        'company.themeColor',
        'company.customerModule',
        'company.shipmentQuota',
        'company.invoiceRemark',
        'company.priceDetailRemark',
        'company.updatedByUserId',
        'company.blTerms',
        'paymentAdvices',
        'bank.name',
        'currency.name',
        'hblh.createdAt',
        'hblh.activity',
        'hblhc.fullName',
      ])
      .getOne();

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const subscription = await this.subscriptionHistoryRepo
      .createQueryBuilder('sh')
      .where(
        `
        sh.companyId = :companyId
        AND sh.activeDate <= CURDATE()
        AND CURDATE() < sh.expiryDate 
      `,
        { companyId },
      )
      .select([
        `DATE_FORMAT(sh.activeDate, '%d/%m/%Y') AS activeDate`,
        `DATE_FORMAT(sh.expiryDate, '%d/%m/%Y') AS expiryDate`,
        'sh.type AS type',
        'sh.duration AS duration',
        'DATEDIFF(sh.expiryDate,CURDATE()) AS remainingActive',
        
      ])
      .orderBy('sh.activeDate', 'ASC')
      .limit(1)
      .getRawOne();

    return { ...company, subscription };
  }

  async getQuota(id: number) {
    try {
      return await this.companyRepo
        .createQueryBuilder('company')
        .select(['company.shipmentQuota','company.shipmentQuotaUnlimited','company.trialLimit'])
        .where('company.id = :id', { id })
        .getOne();
    } catch (error) {
      throw error;
    }
  }

  async getOne(payload: object, select?) {
    return await this.companyRepo.findOne(
      { ...payload },
      { select: select ?? ['id'] },
    );
  }

  async getCompanyHblFormat(companyId: number) {
    try {
      return;
    } catch (err) {
      throw err;
    }
  }

  async getExpiredFreeTrialCompany() {
    const subscriptionHistoriesCompanies = await this.subscriptionHistoryRepo
      .createQueryBuilder('sh')
      .innerJoinAndSelect('sh.company', 'c')
      .select([
        `sh.companyId as companyId`,
        `MAX(sh.expiryDate) as maxExpiryDate`,
        `c.email as companyEmail`,
        `c.affiliation as companyAffiliation`,
        `c.name as companyName`,
      ])
      .where(`c.affiliation = :freeTrialCompanyAffiliation`)
      .groupBy('sh.companyId')
      .having('maxExpiryDate = CURRENT_DATE()')
      .setParameters({
        freeTrialCompanyAffiliation: EAffiliation.TRIAL
      })
      .getRawMany();

    subscriptionHistoriesCompanies.map(async (el) => {
      await this.mailService.sendFreeTrialExpirationNotification(
        el.companyEmail,
        {
          ffName: el.companyName,
          ffLogo:
            'https://demo-files.syncargo.com/saas/1d18aaf2c8d91d8a6e8a91a60852ddb2fc1e1e0d5cfb8e143e9e37fb0e48da6f.blob',
          syncargoAddress:
            'Jln. Jend. Sudirman Kav 25 Go Work Millennium Centennial Center 42th Floor, Karet Kuningan, Setiabudi, Jakarta 12920',
          syncargoPhoneCode: '62',
          syncargoPhoneNumber: '2139708076'
        },
      );
    });
  }
}
