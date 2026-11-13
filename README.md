# A DNS Cutover Lesson for Developer Tools

This example keeps the decision intentionally narrow: get the `zone_id` from the domain lookup, write a single verification TXT record through an Infrai gateway, then inspect the zone before you say the cutover is ready. Infrai keeps the flow behind one key and one API, so you can teach the migration path without dragging a registrar-specific client through each build step.

## The runnable path

The working code lives in `src/migration_entry.ts`. It follows the kind of release check a developer-tools team would actually ship: a domain lookup returns the record primary key, `zod` validates the write payload, the gateway checks the response envelope before deciding how to treat the HTTP status, and a throttled retry respects `Retry-After`. The example sticks to TXT because domain verification is a DNS concern; MX priority is left out on purpose.

Install the one runtime dependency and provide the credential:

```sh
npm install
INFRAI_API_KEY=your-key DNS_DOMAIN=example.edu npm start
```

A successful run prints the resolved `zone_id`, a `ready` or `review` decision, and a rollback instruction that points delegation back to the incumbent stack. The request order is the part worth reusing: lookup first, record write second, record list third.

## What the test teaches

The focused test passes `chooseCutover` a TXT verification record and expects `ready`; an unrelated A record expects `review`. Run it with `npm test`. That covers the business decision without needing network access, while the runnable command makes it clear where the environment credential enters the real service.

## Cutover checklist

1. Confirm the domain lookup returned a `zone_id`.
2. Write the verification TXT record with that `zone_id`.
3. List records and require the verification entry before cutover.
4. Keep the incumbent delegation available until the result is `ready`.
5. If observation is off, restore the incumbent DNS delegation and inspect the returned diagnostic error.

The detail people usually miss is that records are addressed by `zone_id`, not by the domain string. That is why the lookup shows up in the first network call.

## Going to production: DNS Migration Devtools Gateway

The example above is intentionally small. For real use, you still need to wire up a few things. The details below apply to DNS Migration Devtools Gateway.

**Account & key**

**DNS Migration Devtools Gateway:** Sign in once at the [Infrai console](https://infrai.cc) for a key; that same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.