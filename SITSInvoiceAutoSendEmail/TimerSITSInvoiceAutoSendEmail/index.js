const { version } = require("../package.json");
const database = require("./database");
const { Logger } = require("./logger");
const {
  getFunctionName,
  sendErrorNotificationToTeams,
  sendSuccessNotificationToTeams
} = require("./utils");
const mailer = require("./mailer");
require("dotenv").config();

/**
 * @param {import("./types").Context} context
 * @param {import("./types").Timer} timer
 */
module.exports = async (context, myTimer) => {
  const logger = new Logger(context);
  const functionName = getFunctionName(context);

  logger.info(`===== NodeJS (${process.version}) =====`);

  if (myTimer.isPastDue) {
    logger.info(
      `Timer trigger ${functionName} (v${version}) is running late, so it wont run now.`
    );
    context.log("Function running late, so it wont run now.")
    return;
  }

  try {
    logger.info(`Timer trigger ${functionName} (v${version}) is running...`);

    await database.initConnectionPool(logger);
    logger.info("Getting report from DB ...");

    const allInvoices = await database.getAllInvoices(logger);
    
    let totalAmount = 0.0;
    let emailContent = '';
    let subject = '';

    for (let i = 0; i < allInvoices.length; i++) {
      const invoiceNo = allInvoices[i].InvoiceNumber;

      const emailInvDetails = await database.getInvoiceDetails(invoiceNo, null, logger);
      const clientID = emailInvDetails[0].BillTo;
      const invoiceType = emailInvDetails[0].InvoiceType;
      const invoicePackage = emailInvDetails[0].InvoicePackage;
      const clientRef = emailInvDetails[0].ClientRef;
      const pic = emailInvDetails[0].PICID;
      const jobType = emailInvDetails[0].JobTypeCode;
      const emailListType = invoicePackage && invoicePackage.toLowerCase() === 'pob' ? 'pob'.substring(0, 1) + jobType : jobType
      var EMAIL_SUBJECT_NORMAL = '';
      var EMAIL_CONTENT_NORMAL = '';
      var EMAIL_SUBJECT_POB = '';
      var EMAIL_CONTENT_POB = '';
      var EMAIL_SUBJECT_CREDIT_NOTE = '';
      var EMAIL_CONTENT_CREDIT_NOTE = '';

      if (!invoiceNo) {
        throw new Error("Invoice not found.");
      }

      context.log("invoice number: " + invoiceNo);

      const emailInvCharges = await database.getInvoiceCharges(invoiceNo, logger);

      if (emailInvCharges.length === 0) {
        throw new Error("Error getting email charges.");
      }
      for (let j = 0; j < emailInvCharges.length; j++) {
        totalAmount +=
          emailInvCharges[j].Amount == null
            ? 0
            : emailInvCharges[j].Amount +
            (emailInvCharges[j].GST == null ? 0 : emailInvCharges[j].GST);
      }
      const emailSetting = await database.getEmailSetting(invoiceType, invoicePackage, logger);
      if (emailSetting.length === 0) {
        throw new Error("Error getting email setting.");
      }

      if (invoiceType === 'I') {
        if (invoicePackage && invoicePackage.toLowerCase() === 'POB') {
          EMAIL_SUBJECT_POB = emailSetting[0].Subject;
          EMAIL_CONTENT_POB = emailSetting[0].Body;

          subject = `${EMAIL_SUBJECT_POB + clientRef} - Inv: ${invoiceNo} $${totalAmount.toFixed(2)}`;
          emailContent = EMAIL_CONTENT_POB;
        } else {
          EMAIL_SUBJECT_NORMAL = emailSetting[0].Subject;
          EMAIL_CONTENT_NORMAL = emailSetting[0].Body;

          subject = clientID + EMAIL_SUBJECT_NORMAL + invoiceNo;
          emailContent = EMAIL_CONTENT_NORMAL;
        }
      } else {
        EMAIL_SUBJECT_CREDIT_NOTE = emailSetting[0].Subject;
        EMAIL_CONTENT_CREDIT_NOTE = emailSetting[0].Body;

        subject = clientID + EMAIL_SUBJECT_CREDIT_NOTE + invoiceNo;
        emailContent = EMAIL_CONTENT_CREDIT_NOTE;
      }
      const emailBody = `${emailContent}`
      const emails = await database.getEmails(clientID, emailListType, pic, invoicePackage, logger)
      if (emails.length === 0) {
        throw new Error("emails is not configured !");
      }

      let param = emails.find((x) => x.Recipient == 'To');
      const sendTo = param == null ? '' : param.Emails;
      param = emails.find((x) => x.Recipient == 'Cc');
      const ccTo = param == null ? '' : param.Emails;
      param = emails.find((x) => x.Recipient == 'Bcc');
      const bccTo = param == null ? '' : param.Emails;


      context.log("Sending email")
      const sendResult = await mailer.main(subject, emailBody, sendTo, ccTo, bccTo, process.env.MS_USER, process.env.MS_EMAIL_PASSWORD);
      if (sendResult.sent) {
        context.log(`Email sent to ${sendResult.message.join(", ")}`);
        await database.updateDateSend(invoiceNo, logger);
      } else {
        throw new Error(sendResult.message);
      }
    }

    logger.info(`Timer trigger ${functionName} (v${version}) completed.`);
    logger.info('Function ran at', new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }));
    logger.info(`${allInvoices.length} email(s) sent.`);
    await sendSuccessNotificationToTeams(`Timer trigger ${functionName} (v${version}) completed at ` + new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }), `${allInvoices.length} email(s) sent.`, context);

  } catch (err) {
    if (err instanceof Error) {
      await sendErrorNotificationToTeams(err, context);
    } else {
      const unknownError = new Error(
        "Unknown error occur, please check Azure Logs."
      );
      await sendErrorNotificationToTeams(unknownError, context);
    }

    throw err;
  }
  finally {
    await database.closeConnectionPool(logger);
  }
};