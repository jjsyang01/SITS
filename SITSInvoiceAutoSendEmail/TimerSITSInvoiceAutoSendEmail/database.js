require("dotenv").config();
// @ts-expect-error
const sql = require("mssql");
const SYSTEMID = "SYSBATCHAUTO";

const dbPool = new sql.ConnectionPool({
  server: process.env.AZURE_DB_SERVER,
  database: process.env.AZURE_DB_DATABASE,
  user: process.env.AZURE_DB_USER,
  password: process.env.AZURE_DB_PASSWORD,
  options: {
    encrypt: true,
  },
});

/**
 * @param {import("./logger").Logger} logger
 */
const initConnectionPool = async (logger) => {
  try {
    logger.info("Initializing DB connection pool...");
    await dbPool.connect();
    logger.info("DB connection pool initialized.");
  } catch (err) {
    logger.error("initDbConnection", err);

    throw err;
  }
};

/**
 * @param {import("./logger").Logger} logger
 */
const closeConnectionPool = async (logger) => {
  try {
    logger.info("Closing DB connection pool...");
    await dbPool.close();
    logger.info("DB connection pool closed.");
  } catch (err) {
    logger.error("closeDbConnectionPool", err);

    throw err;
  }
};

/**
 * @param {string} invoiceType
 * @param {string} code
 * @param {import("./logger").Logger} logger
 */
const getEmailSetting = async (invoiceType, code, logger) => {
  try {
    let result = '';
    if (code && code.toLowerCase() === 'POB') {
      result = await dbPool
        .request()
        .input("InvoiceType", sql.NVarChar, invoiceType)
        .input("Code", sql.NVarChar, code)
        .query(
          `
        SELECT * From C_EmailSetting Where InvoiceType = @InvoiceType and Code = @Code
        `
        );
    } else {
      result = await dbPool
        .request()
        .input("InvoiceType", sql.NVarChar, invoiceType)
        .input("Code", sql.NVarChar, code)
        .query(
          `
        SELECT * From C_EmailSetting Where InvoiceType = @InvoiceType and Code is null
        `
        );
    }
    return result.recordset;
  } catch (err) {
    logger.error("getEmailSetting", err);

    throw err;
  }
};


/**
 * @param {string} clientId
 * @param {string} emailListType
 * @param {int} pic
 * @param {string} pob
 * @param {import("./logger").Logger} logger
 */
const getEmails = async (clientId, emailListType, pic, pob, logger) => {
  try {
    const result = await dbPool
      .request()
      .input("ClientID", sql.VarChar, clientId)
      .input("EmailListType", sql.VarChar, emailListType)
      .input("PIC", sql.Int, pic)
      .input("POB", sql.VarChar, pob)
      .execute("sfs.PR_GetMailingList");


    // let result = '';
    // const sendTo = await dbPool
    //   .request()
    //   .input("ClientID", sql.NVarChar, clientId).query(
    //     ` SELECT Value FROM TB_ClientSettings WHERE ClientID = @ClientID AND [Key] = 'INVOICE_SEND_TO'`
    //   );

    // var pobSendTo = await dbPool
    //   .request()
    //   .input("ClientID", sql.NVarChar, clientId).query(
    //     ` SELECT Value FROM TB_ClientSettings WHERE ClientID = @ClientID AND [Key] = 'POB_SEND_TO'`
    //   );

    // if (pobSendTo == 'GENERAL;PIC' || pobSendTo == 'PIC;GENERAL') {
    //   pobSendTo = 'BOTH';
    // }

    // if ((pob = 'POB' && pobSendTo == 'BOTH') || sendTo == 'BOTH') {
    //   result = await dbPool
    //     .request()
    //     .input("PIC", sql.NVarChar, pic)
    //     .input("ClientID", sql.NVarChar, clientId)
    //     .input("EmailListType", sql.NVarChar, emailListType)
    //     .query(
    //       ` SELECT Recipient = 'To', STRING_AGG(ToEmails.Emails, ';') as Emails
    //         FROM ( 
    //           SELECT Email as Emails
    //           FROM TB_PIC pic
    //           WHERE PICID = @PIC UNION
    //             SELECT Emails
    //             FROM TB_EmailList
    //             WHERE ClientID = @ClientID 
    //             AND Recipient = 'To' 
    //             AND EmailListType in (SELECT value from string_split(@EmailListType, ';'))
    //             AND DelStatus = 0
    //         ) ToEmails 
    //         UNION
    //           SELECT Recipient = 'Cc', Emails FROM TB_EmailList
    //           WHERE ClientID = @ClientID
    //           AND EmailListType = @EmailListType
    //           AND Recipient = 'Cc'
    //           AND DelStatus = 0
    //         UNION
    //           SELECT Recipient = 'Bcc', Emails FROM TB_EmailList 
    //           WHERE ClientID = @ClientID 
    //           AND EmailListType = @EmailListType
    //           AND Recipient = 'Bcc'
    //           AND DelStatus = 0
    //         `
    //     );
    // } else {
    //   if ((pob == 'POB' && pic != null && pobSendTo == 'PIC') ||
    //     (pob != 'POB' && pic != null && sendTo == 'PIC')) {
    //     result = await dbPool
    //       .request()
    //       .input("PIC", sql.NVarChar, pic)
    //       .input("ClientID", sql.NVarChar, clientId)
    //       .input("EmailListType", sql.NVarChar, emailListType)
    //       .query(
    //         ` 
    //           SELECT Recipient = 'To', Email as Emails FROM TB_PIC pic WHERE PICID = @PIC
    //           UNION
    //             SELECT Recipient = 'Cc', Emails FROM TB_EmailList 
    //             WHERE ClientID = @ClientID 
    //             AND EmailListType = @EmailListType
    //             AND Recipient = 'Cc'
    //             AND DelStatus = 0
    //           UNION
    //             SELECT Recipient = 'Bcc', Emails FROM TB_EmailList 
    //             WHERE ClientID = @ClientID 
    //             AND EmailListType = @EmailListType
    //             AND Recipient = 'Bcc'
    //             AND DelStatus = 0
    //           `
    //       );
    //   } else {
    //     result = await dbPool
    //       .request()
    //       .input("ClientID", sql.NVarChar, clientId)
    //       .input("EmailListType", sql.NVarChar, emailListType)
    //       .query(
    //         ` 
    //           SELECT Recipient, Emails
    //           FROM TB_EmailList
    //           WHERE ClientID = @ClientID
    //           AND EmailListType in (select value from string_split(@EmailListType, ';'))
    //           AND DelStatus = 0
    //           `
    //       );
    //   }
    // }
    return result.recordset;
  } catch (err) {
    logger.error("getEmails", err);

    throw err;
  }
};

/**
 * @param {import("./logger").Logger} logger
 */
const getAllInvoices = async (logger) => {
  try {
    const result = await dbPool
    .request()
    .query(
      `
    SELECT * From TB_Invoice Where InvoiceChecked = 1 AND DateSend is null AND DelStatus = 0
    `
    );

    return result.recordset;
  } catch (err) {
    logger.error("getAllInvoices", err);

    throw err;
  }
};

/**
 * @param {string} keyNumber
 * @param {string} modifiedBy
 * @param {import("./logger").Logger} logger
 */
const getInvoiceDetails = async (keyNumber, modifiedBy, logger) => {
  try {
    const result = await dbPool
      .request()
      .input("KeyNumber", sql.NVarChar, keyNumber)
      .input("ModifiedBy", sql.NVarChar, modifiedBy)
      .execute("sfs.PR_GetInvoiceDetails");

    return result.recordset;
  } catch (err) {
    logger.error("getInvoiceDetails", err);

    throw err;
  }
};

/**
 * @param {string} invoiceNumber
 * @param {import("./logger").Logger} logger
 */
const getInvoiceCharges = async (invoiceNumber, logger) => {
  try {
    const result = await dbPool
      .request()
      .input("InvoiceNumber", sql.NVarChar, invoiceNumber)
      .execute("sfs.PR_GetInvoiceCharges");
    // const result = await dbPool
    //   .request()
    //   .input("InvoiceNumber", sql.NVarChar, invoiceNumber)
    //   .query(
    //     `
    //     SELECT c.InvoiceNumber + cast(c.chargeID as varchar) + cast(c.unitPrice as varchar) + cast(c.InvoiceChargeNo as varchar) as PK
    //     , c.InvoiceNumber, c.InvoiceChargeNo, c.ChargeID, cc.Description, cc.Term, t.Description as TermDesc, c.UnitPrice, Quantity as Qty, Amount
    //     , ReceiptNo, PaymentReceived, Claimed, HSCWarehouseFlag
    //     , GSTRate, isnull(GSTAmt,0) as GST, Amount + GSTAmt as SubTotal,
    //     loc.Description as Location
    //     FROM tb_invoicecharges c
    //         INNER JOIN tb_chargecode cc ON c.chargeID = cc.chargeID
    //         LEFT JOIN c_chargeterm t ON cc.term = t.code
    //         LEFT JOIN c_general loc ON loc.Code = cc.LocationCode AND loc.Type = 'CHARGE_LOCATION'
    //     WHERE c.DelStatus = 0 
    //         AND c.InvoiceNumber = @InvoiceNumber
    //     order by InvoiceChargeNo
    //     `
    //   );

    return result.recordset;
  } catch (err) {
    logger.error("getInvoiceCharges", err);

    throw err;
  }
};


/**
 * @param {string} invoiceNumber
 * @param {import("./logger").Logger} logger
 */
const updateDateSend = async (invoiceNumber, logger) => {
  try {
    await dbPool
      .request()
      .input("InvoiceNumber", sql.NVarChar, invoiceNumber)
      .input("SystemID", sql.NVarChar, SYSTEMID)
      .query(
        `
        UPDATE tb_invoice
        SET DateSend = getdate(),
            ModifiedBy = @SystemID,
            ModifiedDate = getdate()
        WHERE InvoiceNumber = @InvoiceNumber
        `
      );

    logger.info(`${invoiceNumber} invoice date send updated`);
  } catch (err) {
    logger.error(`Failed to update date send: ${invoiceNumber}`);
    logger.error("updateDateSend", err);

    throw err;
  }
};

module.exports = {
  initConnectionPool,
  closeConnectionPool,
  getEmailSetting,
  getEmails,
  getAllInvoices,
  getInvoiceDetails,
  getInvoiceCharges,
  updateDateSend
};
