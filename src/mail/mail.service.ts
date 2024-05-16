import { Injectable } from '@nestjs/common';
import * as Mustache from 'mustache';
import * as fs from 'fs';
import { MailerService } from '@nestjs-modules/mailer';
import { format } from 'date-fns';
import { OtifStatus } from 'src/enums/enum';

const forgotPassword = fs.readFileSync(
  './src/mail/template/forgot-pass.html',
  'utf8',
);
const quotation = fs.readFileSync(
  './src/mail/template-quotation/quotation.html',
  'utf8',
);
const approval = fs.readFileSync(
  './src/mail/template-quotation/quotation-approval.html',
  'utf8',
);
const newPassword = fs.readFileSync(
  './src/mail/template/manage-user-create.html',
  'utf-8',
);
const proformaInvoice = fs.readFileSync(
  './src/mail/template-invoice/proforma-invoice.html',
  'utf-8',
);
const shareProforma = fs.readFileSync(
  './src/mail/template-invoice/share-proforma.html',
  'utf-8',
);
const issuedInvoice = fs.readFileSync(
  './src/mail/template-invoice/issued-invoice.html',
  'utf-8',
);
const editInvoiceRequest = fs.readFileSync(
  './src/mail/template-invoice/edit-invoice-request.html',
  'utf-8',
);
const paymentStatusInvoice = fs.readFileSync(
  './src/mail/template-invoice/payment-status-invoice.html',
  'utf-8',
);
const customerVerify = fs.readFileSync(
  './src/mail/template/customer-verify.html',
  'utf-8',
);
const submitOtif = fs.readFileSync(
  './src/mail/template-otif/submit-otif.html',
  'utf8',
);
const cancelRejectOtif = fs.readFileSync(
  './src/mail/template-otif/cancel-reject-otif.html',
  'utf8',
);
const editOtif = fs.readFileSync(
  './src/mail/template-otif/edit-otif.html',
  'utf8',
);
const delayOtif = fs.readFileSync(
  './src/mail/template-otif/delay-otif.html',
  'utf8',
);
const bidPrice = fs.readFileSync(
  './src/mail/template-quotation/bid-price.html',
  'utf8',
);
const expiration = fs.readFileSync(
  './src/mail/template-quotation/expiration.html',
  'utf8',
);
const remittanceJobSheetPayable = fs.readFileSync(
  './src/mail/template-job-sheet/remittance-job-sheet-payable.html',
  'utf-8',
);
const remittanceJobSheetReceivable = fs.readFileSync(
  './src/mail/template-job-sheet/remittance-job-sheet-receivable.html',
  'utf-8',
);
const freeTrialOver = fs.readFileSync(
  './src/mail/template/free-trial-over.html',
  'utf8',
);
const hblUpdate = fs.readFileSync(
  './src/mail/template/hbl-confirmation.html',
  'utf-8',
);

const requestFileRemoval = fs.readFileSync(
  './src/mail/template-shipment/request-file-removal.html',
  'utf-8',
);

const submitProofPaymentNotification = fs.readFileSync(
  './src/mail/credit-check/submit-proof-payment-notification.html',
  'utf-8',
);


@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(user, type: string) {
    user.year = new Date().getFullYear();
    await this.mailerService.sendMail({
      from: `${user.ffName} <no-reply@syncargo.com>`,
      to: user.email,
      subject:
        type === 'forgot-password' ? 'Reset Password' : 'Create New Password',
      html:
        type === 'forgot-password'
          ? Mustache.render(forgotPassword, user)
          : Mustache.render(newPassword, user),
    });
  }

  async customerVerifyAccount(body) {
    body.year = new Date().getFullYear();
    await this.mailerService.sendMail({
      from: `${body.ffName} <no-reply@syncargo.com>`,
      to: body.email,
      subject: `${body.ffName} - Customer Activate Account`,
      html: Mustache.render(customerVerify, body),
    });
  }

  async submitOtif(body) {
    body.year = new Date().getFullYear();
    const date = ['documentDate', 'pickupDate', 'etd', 'eta'];
    for (const key in body.details) {
      if (date.includes(key)) {
        body.details[key] = format(new Date(body.details[key]), 'MMMM d, yyyy');
      }
    }

    body['message'] =
      'We want to inform you that the shipment has been updated to';

    if (body.otifStatusValue === OtifStatus.ORIGIN_LOCAL_HANDLING) {
      body['pebOrPib'] = 'No PEB';
    }
    if (body.otifStatusValue === OtifStatus.DESTINATION_LOCAL_HANDLING) {
      body['pebOrPib'] = 'No PIB';
    }
    if (body.otifStatusValue === OtifStatus.COMPLETE) {
      body.otifStatus = 'Completed';
      body['message'] = 'We want to inform you that your shipment has been';
    }

    let subject;
    let html;

    if (body.isFailed) {
      subject = `Shipment Status (${body.origin} - ${body.destination}) has been ${body.otifStatus}`;
      html = Mustache.render(cancelRejectOtif, body);
    } else {
      subject = `Shipment Status (${body.origin} - ${body.destination})`;
      html = Mustache.render(submitOtif, body);
    }

    await this.mailerService.sendMail({
      from: `${body.ff.name} <no-reply@syncargo.com>`,
      to: body.email,
      subject,
      html,
    });
  }

  async editOtif(body) {
    body.year = new Date().getFullYear();
    await this.mailerService.sendMail({
      from: `${body.ff.name} <no-reply@syncargo.com>`,
      to: body.email,
      subject: `Shipment details at (${body.otifStatus}) has been updated recently`,
      html: Mustache.render(editOtif, body),
    });
  }

  async delayOtif(body) {
    body.year = new Date().getFullYear();
    await this.mailerService.sendMail({
      from: `${body.ffName} <no-reply@syncargo.com>`,
      to: body.email,
      subject: `Shipment has been delayed (${body.origin} - ${body.destination})`,
      html: Mustache.render(delayOtif, body),
      attachments: body.files ? body.files : null,
    });
  }

  approvalQuotation(email: string, pdf = null, data) {
    try {
      data.year = new Date().getFullYear();
      this.mailerService.sendMail({
        from: `${data.ffName} <no-reply@syncargo.com>`,
        to: email,
        subject:
          data.approvalTitle +
          ` Quotation (${data.origin} - ${data.destination})`,
        html: Mustache.render(approval, data),
        attachments: pdf
          ? [
              {
                filename: `quotation-${data.rfqNumber}.pdf`,
                content: pdf,
              },
            ]
          : null,
      });
    } catch (error) {
      throw error;
    }
  }

  shareQuotation(email: string, pdf = null, data, bid = false) {
    try {
      const title = `Share Quotation (${data.origin} - ${data.destination})`;
      let subject = `${data.ffName} - `;
      let html;
      data.year = new Date().getFullYear();

      if (bid) {
        if (data.isPlace) {
          subject = `New Quotation Available (${data.origin} - ${data.destination})`;
          html = Mustache.render(bidPrice, data);
        } else if (data.isEdit) {
          subject = `Update Quotation (${data.origin} - ${data.destination})`;
          html = Mustache.render(bidPrice, data);
        } else if (data.type === 'EXTEND') {
          data['isExtend'] = true;
          subject = `Extended Quotation (${data.origin} - ${data.destination})`;
          html = Mustache.render(expiration, data);
        } else if (data.type === 'ACCEPT') {
          data['isAccept'] = true;
          subject = `Extended Quotation (${data.origin} - ${data.destination})`;
          html = Mustache.render(expiration, data);
        } else if (data.type === 'REJECT') {
          data['isReject'] = true;
          subject = `Rejected Extended Quotation (${data.origin} - ${data.destination})`;
          html = Mustache.render(expiration, data);
        }
      } else {
        html = Mustache.render(quotation, data);
      }

      this.mailerService.sendMail({
        from: `${data.ffName} <no-reply@syncargo.com>`,
        to: email,
        subject: !bid ? title : subject,
        html,
        attachments: pdf
          ? [
              {
                filename: `${title}.pdf`,
                content: pdf,
              },
            ]
          : null,
      });
    } catch (error) {
      throw error;
    }
  }

  async sendPromofaInvoice(email: string, pdf, data, thirdParty = false) {
    data.year = new Date().getFullYear();
    return await this.mailerService.sendMail({
      from: `${data.ffName} <no-reply@syncargo.com>`,
      to: email,
      subject: `Waiting for Proforma Approval (${data.origin} - ${data.destination})`,
      html: Mustache.render(thirdParty ? shareProforma : proformaInvoice, data),
      attachments: [
        {
          filename: `invoice-${data.invoiceNumber}.pdf`,
          content: pdf,
        },
      ],
    });
  }
  async sendIssuedInvoice(email: string, pdf, data, isCustomEmail = false) {
    data.year = new Date().getFullYear();
    const subTitle = !isCustomEmail ? data.origin + ' - ' + data.destination : data.customerName;
    return await this.mailerService.sendMail({
      from: `${data.ffName} <no-reply@syncargo.com>`,
      to: email,
      subject: `Waiting for Payment (${subTitle})`,
      html: Mustache.render(issuedInvoice, data),
      attachments: [
        {
          filename: `invoice-${data.invoiceNumber}.pdf`,
          content: pdf,
        },
      ],
    });
  }

  async sendPaymentStatusUpdate(email: string, data) {
    data.year = new Date().getFullYear();
    return await this.mailerService.sendMail({
      from: `${data.ffName} <no-reply@syncargo.com>`,
      to: email,
      subject: `Proof of Payment Status Update (${data.origin} - ${data.destination})`,
      html: Mustache.render(paymentStatusInvoice, data),
    });
  }

  async sendBlUploadStatus(
    data: { email: string; companyName: string },
    email?: string[],
  ) {
    return await this.mailerService.sendMail({
      from: `${data.email} <no-reply@syncargo.com>`,
      to: email,
      subject: `${data.companyName} has upload new House Bill of Lading Template`,
      html: Mustache.render(hblUpdate, data),
    });
  }

  async sendFreeTrialExpirationNotification(email: string, body) {
    body.year = new Date().getFullYear();
    return await this.mailerService.sendMail({
      from: `Syncargo <no-reply@syncargo.com>`,
      to: email,
      subject: `Your Syncargo Free Trial Is Over`,
      html: Mustache.render(freeTrialOver, body),
    });
  }

  async sendRemittanceJobSheetPayable(email: string, data) {
    data.year = new Date().getFullYear();
    return await this.mailerService.sendMail({
      from: `${data.ffName} <${data.sender.email}>`,
      to: email,
      cc: data.cc ? data.cc : null,
      subject: data.subject,
      html: Mustache.render(remittanceJobSheetPayable, data),
    });
  }

  async sendRemittanceJobSheetReceivable(email: string, data) {
    data.year = new Date().getFullYear();
    return await this.mailerService.sendMail({
      from: `${data.ffName} <${data.sender.email}>`,
      to: email,
      cc: data.cc ? data.cc : null,
      subject: data.subject,
      html: Mustache.render(remittanceJobSheetReceivable, data),
    });
  }

  async sendEditInvoiceRequest(email: string[], data) {
    return await this.mailerService.sendMail({
      from: `${data.ffName} <no-reply@syncargo.com>`,
      to: email,
      subject: `Issued Invoice Approval`,
      html: Mustache.render(editInvoiceRequest, data),
    });
  }

  async informRemoveDocument(emails: string[], data) {
    data.year = new Date().getFullYear();

    return await this.mailerService.sendMail({
      from: `${data.ffName} <no-reply@syncargo.com>`,
      to: emails,
      subject: `Issued Invoice Approval`,
      html: Mustache.render(requestFileRemoval, data),
    });
  }

  async informProofOfPaymentSubmission(from, attachment, paymentProof, data) {
    const toEmail = process.env.SADM_NOTIFICATION_EMAIL.split(',');
    const attachments = [
      {
        filename: `${paymentProof.name}`,
        content: paymentProof.buffer,
      },
    ];
    if (attachment) {
      attachments.push({
        filename: `${attachment.name}`,
        content: attachment.buffer,
      });
    }
    return await this.mailerService.sendMail({
      from: `${data.ffName} <no-reply@syncargo.com>`,
      to: toEmail,
      subject: 'Waiting for Approval (Credit Check)',
      html: Mustache.render(submitProofPaymentNotification, data),
      attachments,
    });
  }
}
