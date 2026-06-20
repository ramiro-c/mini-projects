import nodemailer from "nodemailer";
import type { Email, EmailSender } from "../email.adapter";

type SmtpConfig = {
	host: string;
	port: number;
	user: string;
	pass: string;
};

export function smtpEmailSender(config: SmtpConfig): EmailSender {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		auth: config.user ? { user: config.user, pass: config.pass } : undefined,
	});

	return {
		async send(email: Email) {
			await transport.sendMail({
				from: "noreply@mini-projects.dev",
				to: email.to,
				subject: email.subject,
				text: email.body,
			});
		},
	};
}
