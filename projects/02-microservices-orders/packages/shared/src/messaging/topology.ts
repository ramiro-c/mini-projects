import type { Channel } from "amqplib";

export const TOPOLOGY = {
	exchange: "orders.events",
	deadLetterExchange: "orders.dlx",
} as const;

export async function assertTopology(channel: Channel): Promise<void> {
	await channel.assertExchange(TOPOLOGY.exchange, "topic", { durable: true });
	// fanout: every dead-lettered message lands in the DLQ regardless of routing key
	await channel.assertExchange(TOPOLOGY.deadLetterExchange, "fanout", { durable: true });
}
