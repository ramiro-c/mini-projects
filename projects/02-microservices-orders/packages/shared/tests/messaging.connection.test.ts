import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, type MessagingConnection } from "../src/messaging/connection.js";
import { assertTopology } from "../src/messaging/topology.js";
import { TOPOLOGY } from "../src/messaging/topology.js";

describe("messaging connection", () => {
	let conn: MessagingConnection;

	beforeAll(async () => {
		conn = await connect();
	});

	afterAll(async () => {
		await conn.close();
	});

	it("se conecta y entrega un channel", () => {
		expect(conn.channel).toBeDefined();
	});

	it("declara la topología de forma idempotente", async () => {
		await assertTopology(conn.channel);
		// re-declarar con los mismos args no debe tirar error
		await assertTopology(conn.channel);
		// checkExchange resuelve sólo si el exchange existe
		await expect(conn.channel.checkExchange(TOPOLOGY.exchange)).resolves.toBeDefined();
		await expect(
			conn.channel.checkExchange(TOPOLOGY.deadLetterExchange),
		).resolves.toBeDefined();
	});
});
