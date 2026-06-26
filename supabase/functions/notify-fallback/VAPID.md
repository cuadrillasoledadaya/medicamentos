# VAPID Key Management

This document describes how to generate, store, and rotate VAPID keys for Web Push notifications.

## One-Time Key Generation

Generate a VAPID key pair on your development machine:

```bash
npx web-push generate-vapid-keys
```

This outputs two Base64-encoded strings:

```
=======================================
Public Key:
BCkx... (65-byte uncompressed P-256)
Private Key:
pK7... (keep this secret)
=======================================
```

> **Note**: If `web-push` is not installed locally, use `npx --package=web-push -- web-push generate-vapid-keys`.

## Storing Keys

### Edge Function Secrets (server-side)

Set the keys as Supabase Edge Function secrets:

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=<your-public-key> \
  VAPID_PRIVATE_KEY=<your-private-key> \
  VAPID_SUBJECT=mailto:admin@medicamentos.app
```

The `VAPID_SUBJECT` must be a `mailto:` or `https://` URI per RFC 8030. This is the contact information sent to push services.

### Client Environment (build-time)

Add the public key to your `.env.local` file (gitignored):

```env
VITE_VAPID_PUBLIC_KEY=<your-public-key>
```

The `VITE_` prefix ensures Vite exposes this at build time via `import.meta.env.VITE_VAPID_PUBLIC_KEY`.

### Production

Set the same environment variables on your production hosting provider:
- `VITE_VAPID_PUBLIC_KEY` — for the Vite build
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — as Supabase secrets for the Edge Function

## Verification

After setting the keys, verify the Edge Function can read them:

```bash
supabase functions serve --env-file .env.local
```

The function should start without throwing "Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY".

## Key Rotation (Out of v1 Scope)

Rotating VAPID keys is a **breaking change** — all active subscriptions will stop receiving pushes because they were encrypted with the old public key.

A proper rotation procedure (v2) would require:
1. A `vapid_key_version` column on `push_subscriptions`
2. A transition window where both old and new keys are accepted
3. Re-subscription of all active devices with the new key

For v1, treat the keypair as permanent. If you must rotate, document the downtime and notify users to re-enable push notifications.

## Security Notes

- **Never commit** the private key to version control
- **Never expose** the private key in client-side code
- The public key is safe to expose (it's in the client bundle)
- Store secrets using `supabase secrets set`, not in `.env` files committed to git
- The same keypair MUST be used across dev, staging, and prod for active subscriptions to work
