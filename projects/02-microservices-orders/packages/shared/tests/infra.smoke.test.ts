import { describe, expect, it } from "vitest";

const endpoints: Array<{ name: string; url: string; auth?: string }> = [
	{ name: "rabbitmq-mgmt", url: "http://localhost:15672/api/overview", auth: "guest:guest" },
	{ name: "prometheus", url: "http://localhost:9090/-/healthy" },
	{ name: "grafana", url: "http://localhost:3001/api/health" },
	{ name: "jaeger", url: "http://localhost:16686/" },
];

describe("infra smoke", () => {
	for (const ep of endpoints) {
		it(`${ep.name} responde 200`, async () => {
			const headers: Record<string, string> = {};
			if (ep.auth) {
				headers.Authorization = `Basic ${Buffer.from(ep.auth).toString("base64")}`;
			}
			const res = await fetch(ep.url, { headers });
			expect(res.status).toBe(200);
		});
	}
});
