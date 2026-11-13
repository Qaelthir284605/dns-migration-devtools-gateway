import { dnsRecordBody, InfraGateway } from "./infra_gateway.ts";

type MigrationInput = {
  domain: string;
  verificationName: string;
  verificationContent: string;
};

export function chooseCutover(
  records: Array<{ record_type: string; name: string; content: string }>,
  verificationName: string,
  verificationContent: string
): "ready" | "review" {
  const hasVerification = records.some((record) =>
    record.record_type === "TXT" &&
    record.name === verificationName &&
    record.content === verificationContent
  );
  return hasVerification ? "ready" : "review";
}

export async function migrateDomain(input: MigrationInput, gateway: InfraGateway) {
  const domain = await gateway.request<{ zone_id: string }>("GET", "/v1/dns/domain/get", undefined, { domain: input.domain });
  const verificationRecord = dnsRecordBody.parse({
    zone_id: domain.zone_id,
    record_type: "TXT",
    name: input.verificationName,
    content: input.verificationContent
  });
  await gateway.request("PUT", "/v1/dns/record/upsert", verificationRecord);
  const listResponse = await gateway.request<{ records: Array<{ record_type: string; name: string; content: string }> }>("GET", "/v1/dns/record/list", undefined, { zone_id: domain.zone_id });
  const records = listResponse.records;
  return {
    zone_id: domain.zone_id,
    decision: chooseCutover(records, input.verificationName, input.verificationContent),
    rollback: "restore the incumbent DNS delegation"
  };
}

const key = process.env.INFRAI_API_KEY;
if (process.argv[1]?.endsWith("migration_entry.ts")) {
  if (!key) throw new Error("Set INFRAI_API_KEY before running the migration example");
  const result = await migrateDomain({
    domain: process.env.DNS_DOMAIN ?? "example.edu",
    verificationName: "_migration",
    verificationContent: "devtools-gateway"
  }, new InfraGateway(key));
  console.log(JSON.stringify(result, null, 2));
}
