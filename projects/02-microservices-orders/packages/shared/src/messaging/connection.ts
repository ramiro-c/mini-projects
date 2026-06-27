import amqp, { type Channel, type ChannelModel } from "amqplib";

export interface MessagingConnection {
	channel: Channel;
	close(): Promise<void>;
}

const DEFAULT_URL = "amqp://guest:guest@localhost:5672";

export async function connect(url?: string): Promise<MessagingConnection> {
	const target = url ?? process.env.RABBITMQ_URL ?? DEFAULT_URL;
	const conn: ChannelModel = await amqp.connect(target);
	const channel = await conn.createChannel();
	let closed = false;
	return {
		channel,
		async close() {
			if (closed) return;
			closed = true;
			try {
				await channel.close();
			} finally {
				await conn.close();
			}
		},
	};
}
