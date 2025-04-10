const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
require("dotenv").config();

const gmailClientId = process.env.GMAIL_CLIENT_ID;
const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
const sendFrom = "hsc.usertest@gmail.com";

/**
 * Send an email to the recipients provided with the subject and body and any attachments
 * @param {string} subject Email subject title
 * @param {string} body Email body content
 * @param {string} toRecipients A list of emails seperated by semi-colons (;) for To section
 * @param {string} ccRecipients A list of emails seperated by semi-colons (;) for Cc section
 * @param {string} bccRecipients A list of emails seperated by semi-colons (;) for Bcc section
 * @param {string} [microsoftUserID] The microsoft user account to be used to send email
 * @param {string} [microsoftPassword] The microsoft password of the microsoft user account
 * @return {Promise<{sent: boolean, message: string[]}>}
 */
const main = async (
    subject,
    body,
    toRecipients,
    ccRecipients,
    bccRecipients,
    microsoftUserID,
    microsoftPassword
) => {
    try {
        let nodemailerConfig = {};
        /**
         * @type {import("nodemailer").SendMailOptions}
         */
        const emailOptions = {
            from: sendFrom,
            to: toRecipients,
            cc: ccRecipients,
            bcc: bccRecipients,
            subject: subject,
            html: body.replace(/(?:\r\n|\r|\n)/g, "<br>"), // replace all line break with the corresponding HTML tag
        };

        // if microsoft is not provided, use gmail as default to send
        if (microsoftUserID) {
            nodemailerConfig = {
                host: "smtp.office365.com",
                port: 587,
                secure: false,
                auth: {
                    user: `${microsoftUserID}${process.env.MS_EMAIL_DOMAIN}`,
                    pass: microsoftPassword,
                },
            };
            emailOptions.from = `${microsoftUserID}${process.env.MS_EMAIL_DOMAIN}`;
        } else {
            const oauth2Client = new OAuth2(
                gmailClientId,
                gmailClientSecret,
                "https://developers.google.com/oauthplayground"
            );

            oauth2Client.setCredentials({
                refresh_token: gmailRefreshToken,
            });

            const accessToken = await oauth2Client.getAccessToken();

            nodemailerConfig = {
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    type: "OAuth2",
                    user: sendFrom,
                    clientId: gmailClientId,
                    clientSecret: gmailClientSecret,
                    refreshToken: gmailRefreshToken,
                    accessToken: accessToken,
                },
            };

            emailOptions.from = sendFrom;
        }
        const transport = nodemailer.createTransport(nodemailerConfig);
        const sentInfo = await transport.sendMail(emailOptions);

        return { sent: true, message: sentInfo.accepted };
    } catch (error) {
        return {
            sent: false,
            message:
                error.response && error.response.includes("Authentication unsuccessful")
                    ? `Please check the password entered.`
                    : error,
        };
    }
};

exports.main = main;
