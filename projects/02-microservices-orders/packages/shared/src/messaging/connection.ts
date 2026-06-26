import amqp, { type Channel, type ChannelModel } from "amqplib";

export interface MessagingConnection {
	channel: Channel;
	close(): Promise<void>;
}

const DEFAULT_URL = "amqp://guest:guest@localhost:5672";

export async function connect(
	url: string = process.env.RABBITMQ_URL ?? DEFAULT_URL,
): Promise<MessagingConnection> {
	const conn: ChannelModel = await amqp.connect(url);
	const channel = await conn.createChannel();
	return {
		channel,
		async close() {
			await channel.close();
			await conn.close();
		},
	};
}
