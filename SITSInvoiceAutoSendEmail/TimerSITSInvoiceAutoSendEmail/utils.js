require("dotenv").config();
const axios = require("axios");
const { Logger } = require("./logger");

/**
 * @param {import("./types").Context} context
 */
const getOperationId = (context) => {
  const trace = context.traceContext.traceparent?.split("-");
  const operationId = trace?.[1];

  return operationId;
};

/**
 * @param {import("./types").Context} context
 */
const getFunctionName = (context) => {
  return context.executionContext.functionName;
};

/**
 * @param {Error} err
 * @param {import("./types").Context} context
 */
const sendErrorNotificationToTeams = async (err, context) => {
  const logger = new Logger(context);

  const functionName = getFunctionName(context);
  const operationId = getOperationId(context);
   const linkToAzurePortalLogsPage = "Portal Log"
  //   "https://portal.azure.com/#view/WebsitesExtension/FunctionTabMenuBlade/~/invocations/resourceId/%2Fsubscriptions%2Fb9ec6993-f7cb-4a48-bb17-6b9ebc2ec234%2FresourceGroups%2Fsits_batchscheduler%2Fproviders%2FMicrosoft.Web%2Fsites%2Fauto-postpone%2Ffunctions%2FTestConsoleLog";

  try {
    const messagePayload = {
      "@type": "MessageCard",
      themeColor: "0072C6",
      summary: "-",
      sections: [
        {
          text: functionName,
          facts: [
            {
              name: "Error",
              value: ` <p>${err.toString()}</p>`,
            },
            {
              name: "Stack",
              value: ` <pre>${err.stack}</pre>`,
            },
          ],
        },
        {
          text: "Logs may be delayed for up to 5 minutes.",
          facts: [
            {
              name: "Logs",
              value: linkToAzurePortalLogsPage,
            },
            {
              name: "Operation ID",
              value: operationId,
            },
          ],
        },
      ],
    };

    const webhookURL = process.env.AZURE_FN_LOG_WEBHOOK_URL || "";

    await axios.post(webhookURL, messagePayload);
  } catch (err) {
    logger.error("Error sending notification to MS Teams", err);
  }
};

/**
 * @param {Error} err
 * @param {import("./types").Context} context
 */
const sendSuccessNotificationToTeams = async (msg, detail, context) => {
  const logger = new Logger(context);

  const functionName = getFunctionName(context);
  const operationId = getOperationId(context);
   const linkToAzurePortalLogsPage = "Portal Log"
  //   "https://portal.azure.com/#view/WebsitesExtension/FunctionTabMenuBlade/~/invocations/resourceId/%2Fsubscriptions%2Fb9ec6993-f7cb-4a48-bb17-6b9ebc2ec234%2FresourceGroups%2Fsits_batchscheduler%2Fproviders%2FMicrosoft.Web%2Fsites%2Fauto-postpone%2Ffunctions%2FTestConsoleLog";

  try {
    const messagePayload = {
      "@type": "MessageCard",
      themeColor: "0072C6",
      summary: "-",
      sections: [
        {
          text: functionName,
          facts: [
            {
              name: "Success",
              value: ` <p>${msg.toString()}</p>`,
            },
            {
              name: "Details",
              value: ` <p>${detail.toString()}</p>`,
            },
          ],
        },
        {
          text:  `Logs may be delayed for up to 5 minutes.`,
        },
      ],
    };

    const webhookURL = process.env.AZURE_FN_LOG_WEBHOOK_URL || "";

    await axios.post(webhookURL, messagePayload);
  } catch (err) {
    logger.error("Error sending notification to MS Teams", err);
  }
};

module.exports = {
  getOperationId,
  getFunctionName,
  sendErrorNotificationToTeams,
  sendSuccessNotificationToTeams
};
