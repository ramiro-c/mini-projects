import type { Channel } from "amqplib";

export const TOPOLOGY = {
	exchange: "orders.events",
	deadLetterExchange: "orders.dlx",
} as const;

export async function assertTopology(channel: Channel): Promise<void> {
	await channel.assertExchange(TOPOLOGY.exchange, "topic", { durable: true });
	await channel.assertExchange(TOPOLOGY.deadLetterExchange, "topic", { durable: true });
}
